export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    retries: number;
    initialDelay: number;
    onRetry?: (error: any, attempt: number) => void;
  }
): Promise<T> {
  let attempt = 1;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      if (attempt > options.retries) {
        throw error;
      }
      if (options.onRetry) {
        options.onRetry(error, attempt);
      }
      const delay = options.initialDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
      attempt++;
    }
  }
}
