(function( __W, __D ) {
  'use strict';

  var canvas, ctx;
  if ( ( canvas = __D.createElement( 'canvas' ) ) && canvas.getContext ) {

    canvas = __D.querySelector('#theCanvas');
    ctx = canvas.getContext('2d');

    // ## global access to math methods - http://www.47tibo.com/posts/3-generate-random-noise-with-html5-canvas
    for (  let prop of [ 'random', 'round', 'sqrt', 'PI', 'ceil', 'pow' ] ) {
      __W[ `__M_${prop}` ] = Math[ prop ];
    }

    // ## Utils methods : global access

    __W.__U_degToRad = function degToRad( angleDegree ) {
      return angleDegree * ( __M_PI / 180 );
    };

    // takes a "canvas image" & returns a sequence of canvases describing the rotate sequence of this image
    // params: 
    //  originalCanvas: the canvas image
    //  rotateFullAngle: the full rotate angle described by the image
    //  rotateAngle: the initial angle of the image (before rotate sequence applied)
    //  rotateVelocityFactor: integer, define speed of the rotation; the greatest the fastest. Default 0 -> slowest movement
    // clockwise: rotation direction
    __W.__U_createRotateSequence = function createRotateSequence( originalCanvas, rotateFullAngle, rotateAngle=0, rotateVelocityFactor=0, clockwise=true, interpolationFactor=4 ) {
      const
        ROTATE_VELOCITY_BASE = .05, // in degree; base velocity - the slowest movement
        MAX_VELOCITY_FACTOR = ( ( 359 - ROTATE_VELOCITY_BASE ) / ROTATE_VELOCITY_BASE ) | 0;

      // clamp rotateVelocityFactor -> avoid to create a rotateVelocityAngle greater than 359 degree
      rotateVelocityFactor = ( rotateVelocityFactor > MAX_VELOCITY_FACTOR ) ? MAX_VELOCITY_FACTOR : rotateVelocityFactor;

      var { width: originalCanvasWidth, height: originalCanvasHeight } = originalCanvas;
      var
        canvasHeight, canvasWidth,
        rotateVelocityAngle, sequenceCount, rotateSequence = [],
        rotateIterator, nextModuloIndex = -1, nextIndex = -1;

      // canvases dimensions are equals to the hypothenuse of original one (avoid cut edges during rotate)
      canvasWidth = canvasHeight = __M_sqrt( __M_pow( originalCanvasWidth, 2 ) + __M_pow( originalCanvasHeight, 2 ) );

      // velocity; increments rotation for each step of the sequence
      rotateVelocityAngle = ROTATE_VELOCITY_BASE + ( ROTATE_VELOCITY_BASE * rotateVelocityFactor );

      if ( !clockwise ) { // anticlockwise
        rotateVelocityAngle *= -1;
      }

      sequenceCount = __M_ceil( rotateFullAngle / rotateVelocityAngle );

      var canvas, ctx;
      for ( let i = 0; i < sequenceCount; i += 1, rotateAngle += rotateVelocityAngle ) {
        canvas = __D.createElement( 'canvas' );
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        ctx = canvas.getContext( '2d' );
        ctx.translate( canvasWidth / 2, canvasHeight / 2 );
        ctx.rotate( __U_degToRad( rotateAngle ) );
        ctx.drawImage( originalCanvas, -originalCanvasWidth / 2, -originalCanvasHeight / 2 );
        rotateSequence[ i ] = canvas;

        // create iterator object ES6 baby!
        rotateIterator = {
          next: function() {
           var ret;
           nextModuloIndex += 1;
           if ( !( nextModuloIndex % interpolationFactor ) ) {
              nextIndex += 1;
           }
           if ( nextIndex < rotateSequence.length ) {
             ret = {value: rotateSequence[ nextIndex ], done: false};
           } else {
             ret = {value: rotateSequence[ rotateSequence.length - 1 ], done: true};
           }
           return ret;
          }
        };
      }

      return rotateIterator;
    };


    // return a sequence of 10 noise pattern
    __W.__U_createNoiseSequence = function createNoiseSequence( width, height ) {
      var
        canvas, ctx,
        imageData, components, n, i, j, r,
        noiseSequence = [];

      for ( let ite = 0; ite < 10; ite += 1 ) {
        canvas = __D.createElement( 'canvas' );
        canvas.width = width;
        canvas.height = height;
        ctx = canvas.getContext( '2d' );

        imageData = ctx.createImageData( width, height );
        components = imageData.data;
        n = components.length / 2;
        i = 0;
        j = components.length - 1;

        while ( i < n ) {
          r = ( __M_random() * 256 ) | 0;
          components[i++] = components[i++] = components[i++] = r;
          components[i++] = 255;
          components[j--] = 255;
          components[j--] = components[j--] = components[j--] = r;
        }

        ctx.putImageData( imageData, 0, 0 );
        noiseSequence[ ite ] = canvas;
      }

      return noiseSequence;
    };

    // create a "shape". a "shape" is made of "figures": lines & arcs 
    //
    // param: shape; the original shape, will be updated with "drawCoords" (points)
    // the function also defines N "moves" for the drawing function
    __W.__U_createShape = function createShape( shape ) {
      var { velocity, figures } = shape;

      var moves = 1 / velocity;

      shape.movesCount = moves;
      shape.moveIndex = 0;

      var figureElem, lineFigures = [],
        arcFigures = [];

      for ( let i = 0, l = figures.length; i < l; i += 1 ) {
        figureElem = figures[ i ];
        switch ( figureElem.figure ) {
          case 'line':
            lineFigures.push( figureElem );
            break;
          case 'arc':
            arcFigures.push( figureElem );
            break;
          default:
            break;
        }
      }

      // lines 
      var velocityX, velocityY, dx, dy, x, y, lineFigure;

      for ( let i = 0, l = lineFigures.length; i < l; i += 1 ) {
        lineFigure = lineFigures[ i ];
        lineFigure.drawCoords = [];

        // first coords
        lineFigure.drawCoords[ 0 ] = lineFigure.coords[ 0 ];

        dx = lineFigure.coords[ 1 ].x - lineFigure.coords[ 0 ].x;
        dy = lineFigure.coords[ 1 ].y - lineFigure.coords[ 0 ].y;

        x = lineFigure.coords[ 0 ].x;
        y = lineFigure.coords[ 0 ].y;

        velocityX = dx / moves;
        velocityY = dy / moves;
        
        for ( let i = 0; i < moves; i += 1 ) {
          lineFigure.drawCoords[ i + 1 ] = { x: x += velocityX, y: y += velocityY };
        }
      }

      // arcs
      var velocityArc, arcFigure, startArc, firstStartArc;

      for ( let i = 0, l = arcFigures.length; i < l; i += 1 ) {
        arcFigure = arcFigures[ i ];

        velocityArc =  __U_degToRad( arcFigure.fullAngle ) / moves;

        arcFigure.drawArcs = [];
        // init startArc
        firstStartArc = startArc = __U_degToRad( arcFigure.startAngle );
        for ( let i = 0; i < moves; i += 1 ) {
          arcFigure.drawArcs[ i ] = { startArc: firstStartArc, endArc: startArc += velocityArc };
        }
      }
    };

    // anim a "shape" (previously created by createShape() )
    // during the animation, figures are drawn "in sync"
    __W.__U_animShape = function animShape( shape ) {
      var figures = shape.figures;

      var lineFigures = figures.filter( function( figureElem ) {
        return figureElem.figure === 'line';
      } );

      var arcFigures = figures.filter( function( figureElem ) {
        return figureElem.figure === 'arc';
      } );

      // lines
      var lineFigure, drawCoords, firstDrawCoords;

      for ( let i = 0, l = lineFigures.length; i < l; i += 1 ) {
        lineFigure = lineFigures[ i ];
        firstDrawCoords = lineFigure.drawCoords[ 0 ];
        drawCoords = lineFigure.drawCoords[ shape.moveIndex + 1 ];

        ctx.beginPath();
        ctx.moveTo( firstDrawCoords.x, firstDrawCoords.y );
        ctx.lineTo( drawCoords.x, drawCoords.y );
        ctx.stroke();
      }

      // arcs
      var arcFigure, centerCoords, drawArcs;

      for ( let i = 0, l = arcFigures.length; i < l; i += 1 ) {
        arcFigure = arcFigures[ i ];
        centerCoords = arcFigure.centerCoords;
        drawArcs = arcFigure.drawArcs[ shape.moveIndex ];

        ctx.beginPath();
        ctx.arc( centerCoords.x, centerCoords.y, arcFigure.radius, drawArcs.startArc, drawArcs.endArc );
        ctx.stroke();
      }

      // one move done
      shape.moveIndex += 1;

      if ( shape.moveIndex === shape.movesCount ) {
        shape.moveIndex = shape.movesCount - 1;
      }
    };

    // create a serie of drawable "paths".
    // those paths are connected in a single, uncut, line
    // there is 2 types of paths: straight and angles
    // param: pathsObj; the original paths, will be updated with "drawCoords" (points)
    __W.__U_createPaths = function createPaths( pathsObj ) {
    var { velocity, paths } = pathsObj;

    var moves = 1 / velocity;

    pathsObj.currentPath = null;
    pathsObj.moves = moves;
    pathsObj.moveIndex = 0;

    var velocityX, velocityY, dx, dy, x, y, path, previousPath, firstCoords, lastCoords;

    for ( let i  = 0, l = paths.length; i < l; i += 1 ) {
      path = paths[ i ];
      previousPath = paths[ i - 1 ];

      // for animate
      path.done = false;

      // compute first & last coords
      if ( previousPath ) {
        firstCoords = previousPath.coords[ previousPath.coords.length - 1 ];
      } else { // 1st path
        firstCoords = path.coords[ 0 ];
      }

      path.drawCoords = [];
      // put 1st drawCoords;
      path.drawCoords[ 0 ] = firstCoords;
      // depend on angle or not
      lastCoords = path.coords[ path.coords.length - 1 ];

      if ( !path.isAngle ) { // n drawCoords left, based on moves
        dx = lastCoords.x - firstCoords.x;
        dy = lastCoords.y - firstCoords.y;

        x = firstCoords.x;
        y = firstCoords.y;
          
        velocityX = dx / moves;
        velocityY = dy / moves;
        
        for ( let i = 0; i < moves; i += 1 ) {
          path.drawCoords[ i + 1 ] = { x: x += velocityX, y: y += velocityY };
        }

      } else { // else, an angle, only 3 drawCoords; still 2 left
        if ( previousPath ) {
          path.drawCoords[ 1 ] = path.coords[ 0 ];
        } else { // 1st path
          path.drawCoords[ 1 ] = path.coords[ 1 ];
        }
        path.drawCoords[ 2 ] = lastCoords;
      }
    } // loop on paths
   };

    // anim a "pathsObj" (previously created by createPaths() )
    // during the animation, paths are drawn "in serie"
   __W.__U_animPaths = function animPaths( pathsObj ) {
    var { paths } = pathsObj;

    var path, previousPath, drawCoords;

    for ( let i = 0, l = paths.length; i < l; i += 1 ) {
      path = paths[ i ];
      previousPath = paths[ i - 1 ];
      drawCoords = path.drawCoords;

      if ( previousPath && previousPath.done || !previousPath ) {
        if ( !path.isAngle ) {
          if ( !path.done ) { // 1st time we draw the path, step/step
            pathsObj.moveIndex += 1;
            ctx.beginPath();
            ctx.moveTo( path.drawCoords[ 0 ].x, path.drawCoords[ 0 ].y );
            ctx.lineTo( path.drawCoords[ pathsObj.moveIndex ].x, path.drawCoords[ pathsObj.moveIndex ].y );
            ctx.stroke();

            if ( pathsObj.moveIndex === pathsObj.moves ) {
              // current path done; next time do it in one shot
              path.done = true;
              pathsObj.moveIndex = 0;
            }
          } else {  // one shot
            ctx.beginPath();
            ctx.moveTo( path.drawCoords[ 0 ].x, path.drawCoords[ 0 ].y );
            ctx.lineTo( path.drawCoords[ pathsObj.moves ].x, path.drawCoords[ pathsObj.moves ].y );
            ctx.stroke();
          }
        } else { // isAngle -> instant draw; 3 coords
          ctx.beginPath();
          ctx.moveTo( path.drawCoords[ 0 ].x, path.drawCoords[ 0 ].y );
          ctx.lineTo( path.drawCoords[ 1 ].x, path.drawCoords[ 1 ].y );
          ctx.lineTo( path.drawCoords[ 2 ].x, path.drawCoords[ 2 ].y );
          ctx.stroke();

          path.done = true;
        }
      }
    }
  };

    // ## GAME!
    var
      // dims
      canvasWidth = canvas.width,
      canvasHeight = canvas.height,

      // audios
      creditsAudio = new Audio(),

      // images
      spriteSheets = {
        'falling': {
          url: 'https://s3-eu-west-1.amazonaws.com/madmengame/falling-spritesheet.png',
          mapping: [
            {
              x: 4,
              y: 4,
              width: 400,
              height: 339
            },
            {
              x: 413,
              y: 4,
              width: 200,
              height: 226
            },
            {
              x: 620,
              y: 4,
              width: 500,
              height: 543
            },
            {
              x: 1135,
              y: 4,
              width: 200,
              height: 70
            },
            {
              x: 4,
              y: 558,
              width: 500,
              height: 471
            }
          ]
        }
      },
      fallingSpriteSheet = new Image(),
      madManCouch = new Image(),

      // credits
      creditsStart,

      noiseSequence = {
        sequence: null,
        sequenceLength: 0,
        sequenceIndex: 0,
      },

      fallingMadMen = [
        { // medium man
          rotateFullAngle: 35,
          rotateAngle: 5,
          rotateVelocityFactor: 5,
          x: .85, // percent of canvas width from left
          y: .4, // percent of canvas height from top
          velocityY: 1.8
        },
        { // small
          rotateFullAngle: 60,
          rotateAngle: 5,
          rotateVelocityFactor: 2,
          x: .65,
          y: .15,
          velocityY: 1.3
        },
        { // large
          rotateFullAngle: 25,
          rotateAngle: 5,
          rotateVelocityFactor: 4,
          x: .5,
          y: .1,
          velocityY: 1.9
        },
        { // small
          rotateFullAngle: 57,
          rotateAngle: 5,
          rotateVelocityFactor: 5,
          x: .35,
          y: .4,
          velocityY: 1.3
        },
        { // large
          rotateFullAngle: 1,
          rotateAngle: 5,
          rotateVelocityFactor: 10,
          x: .15,
          y: .9,
          velocityY: 2.5
        }
      ],

      // letters "MAD MEN"
      mPaths1 = {
        velocity:.01, // max 1 -> instant drawing
        paths: [
          {
            coords: [
              { x: 450, y: 370 },
              { x: 450, y: 230 }
            ]
          },
          {
            isAngle: true,
            coords: [
              { x: 450, y: 220 },
              { x: 455, y: 235 }
            ]
          },
          {
            coords: [
              { x: 504, y: 360 }
            ]
          },
          {
            isAngle: true,
            coords: [
              { x: 505, y: 365 },
              { x: 506, y: 360 }
            ]
            
          },
          {
            coords: [
              { x: 555, y: 245 }
            ]
            
          },
          {
            isAngle: true,
            coords: [
              { x: 565, y: 220 },
              { x: 565, y: 230 }
            ]
          },
          {
            coords: [
              { x: 565, y: 370 }
            ]
          },
        ]
      },

      aPaths = {
        velocity:.01,
        paths: [
          {
            coords: [
              { x: 605, y: 370 },
              { x: 652, y: 230 }
            ]
          },
          {
            isAngle: true,
            coords: [
              { x: 655, y: 220 },
              { x: 658, y: 230 }
            ]
          },
          {
            coords: [
              { x: 705, y: 370 }
            ]
          },
          {
            coords: [
              { x: 685, y: 320 }
            ]
          },
          {
            coords: [
              { x: 625, y: 320 }
            ]
          },
        ]
      },

      dShape = {
        velocity: .0025,
        figures: [
          {
            figure: 'line',
            coords: [
                { x: 745, y: 370 },
                { x: 745, y: 220 }
              ]
          },
          {
            figure: 'arc',
            centerCoords: { x: 745, y: 295 },
            fullAngle: 180,
            startAngle: 270,
            radius: 65
          }
        ]
      },

      mPaths2 = {
        velocity:.01, // max 1 -> instant drawing
        paths: [
          {
            coords: [
              { x: 845, y: 370 },
              { x: 845, y: 230 }
            ]
          },
          {
            isAngle: true,
            coords: [
              { x: 845, y: 220 },
              { x: 855, y: 245 }
            ]
          },
          {
            coords: [
              { x: 904, y: 360 }
            ]
          },
          {
            isAngle: true,
            coords: [
              { x: 905, y: 365 },
              { x: 906, y: 360 }
            ]
            
          },
          {
            coords: [
              { x: 955, y: 245 }
            ]
            
          },
          {
            isAngle: true,
            coords: [
              { x: 965, y: 220 },
              { x: 965, y: 230 }
            ]
            
          },
          {
            coords: [
              { x: 965, y: 370 }
            ]
            
          },
        ]
      },

      eShape = {
        velocity: .0025,
        figures: [
          {
            figure: 'line',
            coords: [
                { x: 1005, y: 220 },
                { x: 1005, y: 370 }
              ]
          },
          {
            figure: 'line',
            coords: [
                { x: 1005, y: 230 },
                { x: 1095, y: 230 }
              ]
          },
          {
            figure: 'line',
            coords: [
                { x: 1005, y: 295 },
                { x: 1095, y: 295 }
              ]
          },
          {
            figure: 'line',
            coords: [
                { x: 1005, y: 360 },
                { x: 1095, y: 360 }
              ]
          }
        ]
      },

      nPaths = {
        velocity: .008,
        paths: [
          {
            coords: [
              { x: 1125, y: 370 },
              { x: 1125, y: 245 }
            ]
          },
          {
            isAngle: true,
            coords: [
              { x: 1125, y: 225 },
              { x: 1135, y: 245 }
            ]
          },
          {
            coords: [
              { x: 1195, y: 345 }
            ]
          },
          {
            isAngle: true,
            coords: [
              { x: 1205, y: 365 },
              { x: 1205, y: 345 }
            ]
          },
          {
            coords: [
              { x: 1205, y: 220 }
            ]
          }
        ]
      },

      // game loop
      appState,
      isCreditsPristine = true;

    const
      STATE_CREDITS_INIT = 10,
      STATE_CREDITS_PLAYING = 20,
      STATE_GAME_INIT = 30;

    function gameLoop() {
      switch ( appState ) {
        case STATE_CREDITS_INIT:
          isCreditsPristine && initCredits();
          break;
        case STATE_CREDITS_PLAYING:
          drawCredits();
        default:
          break;
      }
    }

    function initCredits() {
      isCreditsPristine = false;

      fallingSpriteSheet.addEventListener( 'load', () => {
        // madMen sequences
        var
          fallingSpriteSheetMapping = spriteSheets.falling.mapping,
          currentMapping, currentMadMan, currentSequence, tmpCanvas, tmpCtx;

        for ( let i = 0, l = fallingSpriteSheetMapping.length; i < l; i += 1 ) {
          currentMapping = fallingSpriteSheetMapping[ i ];
          tmpCanvas = __D.createElement( 'canvas' );
          tmpCanvas.width = currentMapping.width;
          tmpCanvas.height = currentMapping.height;
          tmpCtx = tmpCanvas.getContext( '2d' );
          tmpCtx.drawImage(
            fallingSpriteSheet,
            currentMapping.x, currentMapping.y, currentMapping.width, currentMapping.height,
            0, 0, tmpCanvas.width, tmpCanvas.height
          );

          currentMadMan = fallingMadMen[ i ];

          currentSequence = __U_createRotateSequence(
            tmpCanvas,
            currentMadMan.rotateFullAngle,
            currentMadMan.rotateAngle,
            currentMadMan.rotateVelocityFactor,
          );


          // update madman
          currentMadMan.x = currentMadMan.x * canvasWidth;
          currentMadMan.y = - currentMadMan.y * canvasHeight;
          currentMadMan.sequence = currentSequence;
          currentMadMan.width = currentMapping.width;
          currentMadMan.height = currentMapping.height;
        }

        creditsStart = new Date();
        appState = STATE_CREDITS_PLAYING;
        __W.setTimeout( () => {
          creditsAudio.play();
        }, 2500 );
      });

      // init noise
      noiseSequence.sequence = __U_createNoiseSequence( canvasWidth, canvasHeight );
      noiseSequence.sequenceLength = noiseSequence.sequence.length;

      // init letters
      __U_createPaths( mPaths1 );
      __U_createPaths( aPaths );
      __U_createShape( dShape );
      __U_createPaths( mPaths2 );
      __U_createShape( eShape );
      __U_createPaths( nPaths );


      // init madmen & start animation
      fallingSpriteSheet.src = spriteSheets.falling.url;
      madManCouch.src = 'https://s3-eu-west-1.amazonaws.com/madmengame/mad-men-couch.png';
    }

    function ellapsedTimeCredits() {
      return ( ( new Date() - creditsStart ) / 1000 ) | 0;
    }

    // credits screen
    var
      noiseAlpha = 1,
      velocityNoiseAlpha = -.005,
      blackAlpha = 1,
      velocityBlackAlpha = -.005,
      madManCouchAlpha = 0,
      velocityMadManCouchAlpha = +.009;

    function drawCredits() {
      // falling men
     if ( ellapsedTimeCredits() > 12 ) {

        let fallingMadMan, sequenceCanvas;
        for ( let i = 0, l = fallingMadMen.length; i < l; i += 1 ) {
          fallingMadMan = fallingMadMen[ i ];

          // get current canvas via iterator
          sequenceCanvas = fallingMadMan.sequence.next().value;

          // compute current coords ( only move on Y )
          fallingMadMan.y += fallingMadMan.velocityY;

          // draw falling man
          ctx.save();

          ctx.translate( fallingMadMan.x, fallingMadMan.y );

          ctx.drawImage(
            sequenceCanvas,
            - sequenceCanvas.width / 2,
            - sequenceCanvas.height / 2
          );

          ctx.restore();
        }
      }

      // titles
      if ( ellapsedTimeCredits() > 25 ) {
        ctx.lineWidth = 19;
        ctx.lineJoin = 'bevel';
        ctx.strokeStyle = '#020202';
        __U_animPaths( mPaths1 );
        __U_animPaths( aPaths );
        __U_animShape( dShape );
        ctx.strokeStyle = '#c32a25';
        __U_animPaths( mPaths2 );
        __U_animShape( eShape );
        __U_animPaths( nPaths );

      }
      
      // noise
      if ( noiseAlpha > -velocityNoiseAlpha ) {
        if ( ellapsedTimeCredits() > 12 ) {
          noiseAlpha += velocityNoiseAlpha;
        }
        ctx.globalAlpha = noiseAlpha;
        ctx.drawImage( noiseSequence.sequence[ noiseSequence.sequenceIndex++ ], 0, 0 );
        if ( !( noiseSequence.sequenceIndex < noiseSequence.sequenceLength ) ) {
          noiseSequence.sequenceIndex = 0;
        }
        ctx.globalAlpha = 1;
      }

      // black screen
      if ( blackAlpha > -velocityBlackAlpha ) {
        if ( ellapsedTimeCredits() > 4 ) {
          blackAlpha += velocityBlackAlpha;
        }
        ctx.globalAlpha = blackAlpha;
        ctx.fillStyle = 'black';
        ctx.fillRect( 0, 0, canvasWidth, canvasHeight );
        ctx.globalAlpha = 1;
      }

      // drapper on the couch
      if ( ellapsedTimeCredits() > 32 ) {
        madManCouchAlpha += velocityMadManCouchAlpha;
        if ( madManCouchAlpha > 1 ) {
          madManCouchAlpha = 1;
        }
        ctx.globalAlpha = madManCouchAlpha;
        ctx.drawImage( madManCouch, 15, 15 );
        ctx.globalAlpha = 1;
      }

    }

    function drawScreen() {
      ctx.clearRect( 0, 0, canvasWidth, canvasHeight );
      gameLoop();
      __W.requestAnimationFrame( drawScreen );
    }

    // start animation when audio starts
    creditsAudio.addEventListener( 'canplaythrough', () => {
      appState = STATE_CREDITS_INIT;
      drawScreen();
    } );
    creditsAudio.src = 'https://s3-eu-west-1.amazonaws.com/madmengame/mad-men-credits.mp3';

} // ok canvas

}( window, window.document ));


//# sourceMappingURL=main.js.map