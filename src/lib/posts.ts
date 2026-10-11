import { getCollection, type CollectionEntry } from 'astro:content';
import type { Section } from '../consts';

export type Post = CollectionEntry<'posts'>;

/** The last part of the file path, e.g. "professional/my-post" -> "my-post". */
export function postSlug(post: Post): string {
  return post.id.split('/').pop() ?? post.id;
}

export function postUrl(post: Post): string {
  return `/${post.data.section}/${postSlug(post)}/`;
}

/** Published posts, newest first. Optionally limited to one section. */
export async function getPosts(section?: Section): Promise<Post[]> {
  const posts = await getCollection('posts', ({ data }) => {
    if (data.draft) return false;
    return section ? data.section === section : true;
  });
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
