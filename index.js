'use strict';
const async = require('async');
const AWS = require('aws-sdk');
const dateFormat = require('dateformat');
const https = require('https');

const CONFIG = require('./config');

// get reference to S3 client
const s3 = new AWS.S3();

const backupMethod = (event, context, callback) => {
    const dstKey = dateFormat(Date.now(), 'yyyy-mm-dd') + '/details.json';

    // Download the detailed report from toggl, and upload to a S3 bucket.
    // TODO: Download and upload PDF, too
    async.waterfall([
        function download(next) {
            // Download the details from toggl into a buffer.
            const options = {
                host: 'toggl.com',
                port: 443,
                path: '/reports/api/v2/details?user_agent='+CONFIG.TOGGL_CONTACT_MAIL+'&workspace_id='+CONFIG.TOGGL_WORKSPACE_ID,
                method: 'GET',
                auth: CONFIG.TOGGL_API_TOKEN+':api_token'
            };

            https.get(options, function(res) {
                let body = '';
                res.setEncoding('utf8');
                res.on('data', function (chunk) {
                    console.log('BODY: ' + chunk);
                    body = body + '' + chunk;
                });

                res.on('end', function () {
                    next(null, body);
                });
            }).on('error', next);
        },
        function upload(data, next) {
            // Upload toggl export to S3 bucket
            s3.putObject({
                Bucket: CONFIG.DST_BUCKET,
                Key: dstKey,
                Body: data,
                ContentType: 'application/json'
            },
            next);
        }
    ], function (err) {
        if (err) {
            console.error(
                'Unable to backup toggl time sheet due to an error: ' + err
                );
        } else {
            console.log(
                'Successfully uploaded toggl time sheet to ' + CONFIG.DST_BUCKET + '/' + dstKey
                );
        }

        callback(null, 'message');
    }
    );
};

exports.handler = backupMethod;

/* For local machine debug purposes */
if (require.main === module) {
    backupMethod();
}