import { generateText } from 'ai'
import { anthropic } from "@ai-sdk/anthropic";


const result = await generateText({
    model: anthropic("claude-sonnet-4-6"),
    prompt: "Say hello in one sentence.",
})

console.log(result.text)