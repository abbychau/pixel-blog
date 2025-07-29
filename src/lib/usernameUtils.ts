// Username validation and conversion utilities

export function validateUsername(username: string): boolean {
  // Username must be 3-20 characters, only a-z, 0-9, and underscore
  const usernameRegex = /^[a-z0-9_]{3,20}$/;
  return usernameRegex.test(username);
}

export function sanitizeUsername(input: string): string {
  // Convert to lowercase and replace invalid characters with underscore
  return input
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, '') // Remove leading/trailing underscores
    .substring(0, 20); // Limit length
}

export function generateUniqueUsername(baseUsername: string, existingUsernames: string[]): string {
  let username = sanitizeUsername(baseUsername);
  
  // Ensure minimum length
  if (username.length < 3) {
    username = `user_${username}`.substring(0, 20);
  }
  
  // If username is taken, add number suffix
  if (existingUsernames.includes(username)) {
    let counter = 1;
    let uniqueUsername = username;
    
    while (existingUsernames.includes(uniqueUsername) && counter <= 999) {
      const suffix = `_${counter}`;
      const maxBaseLength = 20 - suffix.length;
      uniqueUsername = username.substring(0, maxBaseLength) + suffix;
      counter++;
    }
    
    username = uniqueUsername;
  }
  
  return username;
}

export function isValidDisplayName(displayName: string): boolean {
  // Display name can be 1-50 characters, most characters allowed except some special ones
  return displayName.length >= 1 && 
         displayName.length <= 50 && 
         !/[<>'"&]/.test(displayName); // Prevent XSS characters
}

export function sanitizeDisplayName(input: string): string {
  return input
    .trim()
    .replace(/[<>'"&]/g, '') // Remove XSS characters
    .substring(0, 50);
}