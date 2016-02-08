exports.config = {
  "files": {
    "javascripts": {
      "joinTo": {
        'main.js': /^app\//,
        'vendor.js': /^bower_components\/|^app\/vendor/
      }
    },
    "stylesheets": {
        "joinTo": "main.css"
    }
  },
  "modules": {
    "definition": false,
    "wrapper": false
  }
};