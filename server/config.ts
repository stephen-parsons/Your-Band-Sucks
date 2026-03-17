export default {
  aws: {
    region: process.env.AWS_REGION,
    bucket: {
      audioFiles: process.env.S3_AUDIO_FILES_BUCKET,
      images: process.env.S3_IMAGES_BUCKET,
    } as const,
  },
};
