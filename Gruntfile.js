let grunt = require('grunt');
grunt.loadNpmTasks('grunt-aws-lambda');

grunt.initConfig({
    lambda_package: {
        default: {
            options: {
                include_time: false
            }
        }
    },
    lambda_deploy: {
        default: {
            arn: 'arn:aws:lambda:us-east-1:894598711988:function:Cleanup-SendRequest-XJD4L3CINT4S'
        }
    }
});

grunt.registerTask('deploy', ['lambda_package', 'lambda_deploy:default']);