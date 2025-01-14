#! /usr/bin/env node

import { Command } from 'commander';
import { doCopy } from './index.js';

const cli = new Command();
cli
  .description('Script to download full HLS package and upload to an S3 bucket')
  .argument('<source>', 'URL of the HLS playlist')
  .argument('<dest>', 'URL of the destination S3 bucket')
  .option('--dest-region <destRegion>', 'Destination S3 region (DEST_REGION)')
  .option(
    '--dest-endpoint <destEndpoint>',
    'Destination S3 endpoint (DEST_ENDPOINT)'
  )
  .option(
    '--dest-access-key <destAccessKey>',
    'Destination S3 access key (DEST_ACCESS_KEY)'
  )
  .option(
    '--dest-secret-key <destSecretKey>',
    'Destination S3 secret key (DEST_SECRET_KEY)'
  )
  .option(
    '--staging-dir <stagingDir>',
    'Staging directory (STAGING_DIR)',
    '/tmp/data'
  )
  .action(async (source, dest, options) => {
    try {
      await doCopy({
        source: new URL(source),
        dest: {
          s3url: new URL(dest),
          s3region: process.env.DEST_REGION || options.destRegion,
          s3endpoint: process.env.DEST_ENDPOINT || options.destEndpoint,
          s3accessKey: process.env.DEST_ACCESS_KEY || options.destAccessKey,
          s3secretKey: process.env.DEST_SECRET_KEY || options.destSecretKey
        },
        stagingDir: process.env.STAGING_DIR || options.stagingDir
      });
    } catch (err) {
      console.log((err as Error).message);
    }
  });

cli.parseAsync(process.argv);
