import { queries } from './database';
import { extractTagsAndMentions } from './markdown';

// Generate slug from tag name
function generateTagSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Get or create tag
function getOrCreateTag(tagName: string): { id: number } {
  // Check if tag exists
  let tag = queries.getTagByName.get(tagName);
  
  if (!tag) {
    // Create new tag
    const slug = generateTagSlug(tagName);
    const colors = ['#00ff00', '#0080ff', '#ff8c00', '#ff0080', '#ffff00', '#ff4040'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    const result = queries.insertTag.run(tagName, slug, randomColor);
    tag = { id: result.lastInsertRowid, name: tagName, slug, color: randomColor, article_count: 0 };
  }
  
  return tag;
}

// Update tag article counts
function updateTagCounts() {
  const tags = queries.getAllTags.all();
  
  for (const tag of tags) {
    const count = queries.getTagArticles.all(tag.id).length;
    queries.updateTagCount.run(count, tag.id);
  }
}

// Process tags for an article
export async function processArticleTags(articleId: number, content: string) {
  const { tags } = extractTagsAndMentions(content);
  
  // Remove existing article tags
  queries.deleteArticleTags.run(articleId);
  
  // Add new tags
  for (const tagName of tags) {
    const tag = getOrCreateTag(tagName);
    queries.insertArticleTag.run(articleId, tag.id);
  }
  
  // Update all tag counts
  updateTagCounts();
}

// Process mentions for an article
export async function processArticleMentions(articleId: number, content: string, articleTitle: string) {
  const { mentions } = extractTagsAndMentions(content);
  
  // Remove existing mentions
  queries.deleteMentions.run(articleId);
  
  // Create new mentions and notifications
  for (const username of mentions) {
    // Find user by username (now using the new username format)
    const user = queries.getUserByUsername.get(username);
    
    if (user) {
      // Create mention record
      const mentionResult = queries.insertMention.run(
        articleId,
        user.id,
        user.username, // Store the actual username
        `Mentioned in article: ${articleTitle}`
      );
      
      // Create notification
      queries.insertNotification.run(
        user.id,
        'mention',
        'You were mentioned in an article',
        `@${user.username} mentioned you in "${articleTitle}"`,
        articleId,
        mentionResult.lastInsertRowid
      );
    }
  }
}

// Main function to process tags and mentions when article is saved
export async function processArticleTagsAndMentions(
  articleId: number, 
  content: string, 
  articleTitle: string,
  isPublished: boolean = false
) {
  try {
    // Always process tags
    await processArticleTags(articleId, content);
    
    // Only process mentions for published articles
    if (isPublished) {
      await processArticleMentions(articleId, content, articleTitle);
    }
  } catch (error) {
    console.error('Error processing tags and mentions:', error);
    throw error;
  }
}

// Function to clean up tags and mentions when article is deleted
export async function cleanupArticleTagsAndMentions(articleId: number) {
  try {
    // Remove article tags
    queries.deleteArticleTags.run(articleId);
    
    // Remove mentions
    queries.deleteMentions.run(articleId);
    
    // Update tag counts
    updateTagCounts();
    
    // Clean up tags with zero articles
    const tagsWithZeroCount = queries.getAllTags.all().filter((tag: any) => tag.article_count === 0);
    for (const tag of tagsWithZeroCount) {
      queries.deleteTag.run(tag.id);
    }
  } catch (error) {
    console.error('Error cleaning up tags and mentions:', error);
    throw error;
  }
}