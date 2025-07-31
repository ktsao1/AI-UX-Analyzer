class GeminiRateLimiter {
    private requestTimes: number[] = [];
    private requestsThisDay = 0;
    private dayStart = Date.now();
    private readonly REQUESTS_PER_MINUTE = 20;
    private readonly REQUESTS_PER_DAY = 1000;

    async waitIfNeeded(): Promise<void> {
        const now = Date.now();
        
        // Clean up requests older than 1 minute
        this.requestTimes = this.requestTimes.filter(time => now - time < 60000);
        
        // Reset daily counter if it's a new day
        if (now - this.dayStart > 24 * 60 * 60 * 1000) {
            this.requestsThisDay = 0;
            this.dayStart = now;
        }

        // Check daily limit
        if (this.requestsThisDay >= this.REQUESTS_PER_DAY) {
            const waitTime = this.dayStart + 24 * 60 * 60 * 1000 - now;
            console.log(`Daily limit reached, waiting ${Math.ceil(waitTime / 1000)} seconds until reset`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            this.requestsThisDay = 0;
            this.dayStart = Date.now();
            return this.waitIfNeeded();
        }

        // If we have capacity, proceed immediately
        if (this.requestTimes.length < this.REQUESTS_PER_MINUTE - 1) {
            this.addRequest();
            return;
        }

        // If we're at capacity, calculate optimal delay
        const oldestRequest = this.requestTimes[0];
        const timeUntilSlotFree = 60000 - (now - oldestRequest);
        
        if (timeUntilSlotFree > 0) {
            // Calculate optimal spacing for remaining slots
            const freeSlots = this.REQUESTS_PER_MINUTE - this.requestTimes.length;
            const spacing = Math.max(timeUntilSlotFree / (freeSlots + 1), 50); // minimum 50ms spacing
            
            console.log(`Rate limit approaching, waiting ${Math.ceil(spacing)}ms`);
            await new Promise(resolve => setTimeout(resolve, spacing));
        }

        this.addRequest();
    }

    private addRequest() {
        const now = Date.now();
        this.requestTimes.push(now);
        this.requestsThisDay++;
    }

    getRemainingQuota(): { minute: number; day: number } {
        const now = Date.now();
        return {
            minute: this.REQUESTS_PER_MINUTE - this.requestTimes.filter(time => now - time < 60000).length,
            day: this.REQUESTS_PER_DAY - this.requestsThisDay
        };
    }
}

// Create a singleton instance for the Gemini API limits
export const geminiRateLimiter = new GeminiRateLimiter();
