import { BUCKETS, createPresignedUrlWithClientGET } from "../service/S3Service";

/**
 * A post row that still includes the S3 object key and optional like status
 * before client-facing serialization.
 */
interface PostToSerialize {
  id: number;
  key: string;
  likeCount: number;
  like?: string | null;
}

export type SerializedPost<T extends PostToSerialize = PostToSerialize> = Omit<
  T,
  "key" | "like"
> & {
  url: string;
  like: string | undefined;
};

/**
 * Attach a presigned GET URL, normalize like to lowercase, and strip `key`.
 */
async function serializePost<T extends PostToSerialize>(
  post: T,
): Promise<SerializedPost<T>> {
  // todo: get presignedUrls from cloudfront — cheaper/faster than s3 presign urls
  const url = await createPresignedUrlWithClientGET({
    key: post.key,
    bucket: BUCKETS.audioFiles,
  });
  const { key: _key, like, ...rest } = post;
  return {
    ...(rest as Omit<T, "key" | "like">),
    url,
    like: like?.toLocaleLowerCase(),
  };
}

export async function serializePosts<T extends PostToSerialize>(
  posts: T[],
): Promise<SerializedPost<T>[]> {
  return Promise.all(posts.map((post) => serializePost(post)));
}
