import { processRobotsRewards } from './process_rewards';

export const handler = async (event: any) => {
    try {
        const results = await processRobotsRewards();
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Robot rewards processed successfully',
                results
            })
        };
    } catch (error) {
        console.error('Error processing robot rewards:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to process robot rewards' })
        };
    }
}; 