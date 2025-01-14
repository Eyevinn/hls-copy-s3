import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

import HLSDownloader from 'hlsdownloader';
import { spawnSync } from 'child_process';

const DEFAULT_STAGING_DIR = '/tmp/data';

export interface BucketConfig {
  s3url: URL;
  s3region?: string;
  s3endpoint?: string;
  s3accessKey?: string;
  s3secretKey?: string;
}

export interface CopyOptions {
  source: URL;
  dest: BucketConfig;
  stagingDir?: string;
}

function createS3cmdArgs(cmdArgs: string[], s3EndpointUrl?: string): string[] {
  const args = ['s3'];
  if (s3EndpointUrl) {
    args.push(`--endpoint-url=${s3EndpointUrl}`);
  }
  return args.concat(cmdArgs);
}

async function prepare(stagingDir = DEFAULT_STAGING_DIR) {
  const jobId = Math.random().toString(36).substring(7);
  const jobDir = join(stagingDir, jobId);
  if (!existsSync(jobDir)) {
    mkdirSync(jobDir, { recursive: true });
  }
  return jobDir;
}

async function cleanup(stagingDir: string) {
  console.log(`Cleaning up ${stagingDir}`);
  rmSync(stagingDir, { recursive: true, force: true });
}

async function upload(dest: BucketConfig, stagingDir: string) {
  console.log(`Uploading from ${stagingDir} to ${dest.s3url}`);
  const args = createS3cmdArgs(
    ['sync', stagingDir, dest.s3url.toString()],
    dest.s3endpoint
  );
  const { status, stderr } = spawnSync('aws', args, {
    env: {
      AWS_ACCESS_KEY_ID: dest.s3accessKey,
      AWS_SECRET_ACCESS_KEY: dest.s3secretKey,
      AWS_REGION: dest.s3region
    },
    stdio: 'inherit',
    shell: true
  });
  if (status !== 0) {
    if (stderr) {
      console.log(stderr.toString());
    }
    throw new Error('Sync to remote bucket failed: ' + status);
  }
  console.log(`Synced ${stagingDir} to ${dest.s3url.toString()}`);
}

export async function doCopy(opts: CopyOptions) {
  const stagingDir = await prepare(opts.stagingDir);
  console.log(`Downloading HLS from ${opts.source.href} to ${stagingDir}`);
  try {
    const download = new HLSDownloader({
      playlistURL: opts.source.href,
      destination: stagingDir,
      concurrency: 5
    });
    const msg = await download.startDownload();
    console.log(msg);
    await upload(opts.dest, stagingDir);
    await cleanup(stagingDir);
  } catch (err) {
    await cleanup(stagingDir);
    throw err;
  }
}
