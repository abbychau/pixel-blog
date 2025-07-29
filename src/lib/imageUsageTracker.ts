import { queries } from './database';

/**
 * Updates the used_in_articles field for all images based on article content
 * This function scans article content for image URLs and updates image usage tracking
 */
export async function updateImageUsageForArticle(articleId: number, content: string) {
  try {
    // Get all images from the database
    const allImages = queries.getAllImages.all();
    
    // For each image, check if it's used in this article's content
    for (const image of allImages) {
      const currentUsage = JSON.parse(image.used_in_articles || '[]') as number[];
      const isUsedInThisArticle = content.includes(image.url) || content.includes(image.filename);
      
      let updatedUsage = [...currentUsage];
      
      if (isUsedInThisArticle) {
        // Add this article ID if not already present
        if (!updatedUsage.includes(articleId)) {
          updatedUsage.push(articleId);
        }
      } else {
        // Remove this article ID if present
        updatedUsage = updatedUsage.filter(id => id !== articleId);
      }
      
      // Update the database if usage changed
      if (JSON.stringify(currentUsage.sort()) !== JSON.stringify(updatedUsage.sort())) {
        queries.updateImageUsage.run(JSON.stringify(updatedUsage), image.id);
      }
    }
  } catch (error) {
    console.error('Error updating image usage for article:', articleId, error);
  }
}

/**
 * Removes an article from all image usage tracking when the article is deleted
 */
export async function removeArticleFromImageUsage(articleId: number) {
  try {
    // Get all images from the database
    const allImages = queries.getAllImages.all();
    
    // For each image, remove this article ID from usage tracking
    for (const image of allImages) {
      const currentUsage = JSON.parse(image.used_in_articles || '[]') as number[];
      const updatedUsage = currentUsage.filter(id => id !== articleId);
      
      // Update the database if usage changed
      if (currentUsage.length !== updatedUsage.length) {
        queries.updateImageUsage.run(JSON.stringify(updatedUsage), image.id);
      }
    }
  } catch (error) {
    console.error('Error removing article from image usage:', articleId, error);
  }
}

/**
 * Rebuilds image usage tracking for all images by scanning all published articles
 * This is useful for fixing inconsistent data or as a maintenance operation
 */
export async function rebuildAllImageUsage() {
  try {
    console.log('🔧 Rebuilding image usage tracking...');
    
    // Get all images and all published articles
    const allImages = queries.getAllImages.all();
    const allArticles = queries.getAllArticles.all();
    
    // Reset all image usage
    const imageUsageMap = new Map<number, number[]>();
    
    // Scan all articles for image usage
    for (const article of allArticles) {
      for (const image of allImages) {
        const isUsed = article.content.includes(image.url) || article.content.includes(image.filename);
        
        if (isUsed) {
          if (!imageUsageMap.has(image.id)) {
            imageUsageMap.set(image.id, []);
          }
          imageUsageMap.get(image.id)!.push(article.id);
        }
      }
    }
    
    // Update all images with new usage data
    for (const image of allImages) {
      const usage = imageUsageMap.get(image.id) || [];
      queries.updateImageUsage.run(JSON.stringify(usage), image.id);
    }
    
    console.log('✅ Image usage tracking rebuilt successfully');
  } catch (error) {
    console.error('Error rebuilding image usage:', error);
  }
}