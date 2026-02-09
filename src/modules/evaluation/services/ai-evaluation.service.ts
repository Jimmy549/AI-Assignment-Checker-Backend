import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { MarkingMode } from '../../assignment/entities/assignment.entity';

interface EvaluationPromptData {
  instructions: string;
  studentContent: string;
  minWords: number;
  markingMode: MarkingMode;
  totalMarks: number;
  passPercentage: number;
  gradingCriteria?: {
    topicRelevance: { weight: number; enabled: boolean };
    structure: { weight: number; enabled: boolean };
    contentQuality: { weight: number; enabled: boolean };
    grammar: { weight: number; enabled: boolean };
    length: { weight: number; enabled: boolean };
  };
}

@Injectable()
export class AiEvaluationService {
  private client: OpenAI;

  constructor(private configService: ConfigService) {
    // Initialize OpenAI SDK with OpenRouter as base URL
    this.client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: this.configService.get('OPENROUTER_API_KEY'),
      defaultHeaders: {
        'HTTP-Referer': this.configService.get('APP_URL') || 'http://localhost:3001',
        'X-Title': 'Assignment Checker',
      },
    });
  }

  async evaluateSubmission(data: EvaluationPromptData): Promise<{
    score: number;
    remarks: string;
    detailedFeedback: {
      topicRelevance: string;
      structure: string;
      contentQuality: string;
      wordCount: number;
      recommendation: string;
    };
  }> {
    const systemPrompt = this.buildSystemPrompt(data.markingMode);
    const userPrompt = this.buildUserPrompt(data);
    const model = 'google/gemini-3-flash-preview';

    try {
      console.log(`🔄 Attempting evaluation with model: ${model}`);
      
        const response = await this.client.chat.completions.create({
          model: model,
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: userPrompt,
            },
          ],
          max_tokens: 500,
          temperature: 0.3,
        });

      console.log(`✅ Successfully evaluated with model: ${model}`);
      
      if (!response.choices?.[0]?.message?.content) {
        throw new Error('AI returned an empty response');
      }

      const content = response.choices[0].message.content;
      return this.parseEvaluationResponse(content, data.totalMarks);
    } catch (error: any) {
      const status = error.status;
      const message = error.message;
      
      console.error(`❌ Evaluation failed with model "${model}":`);
      console.error('Status:', status);
      console.error('Message:', message);
      
      throw new Error(
        `AI evaluation failed: ${message}`
      );
    }
  }

  private buildSystemPrompt(markingMode: MarkingMode): string {
    const basePrompt = `You are an expert assignment evaluator. Your task is to evaluate student submissions based on given instructions.

Evaluation Criteria:
1. Topic Relevance - How well does the submission address the assignment topic?
2. Structure - Does it have clear introduction, body, and conclusion?
3. Content Quality - Is the content accurate, well-organized, and thoughtful?
4. Word Count - Does it meet the minimum word requirement?

Response Format:
You MUST respond with ONLY a valid JSON object (no markdown, no code blocks, just pure JSON) with this structure:
{
  "topicRelevance": "brief assessment",
  "structure": "brief assessment",
  "contentQuality": "brief assessment",
  "wordCount": numeric_value,
  "score": numeric_score_out_of_100,
  "remarks": "brief overall feedback",
  "recommendation": "PASS or FAIL"
}`;

    if (markingMode === MarkingMode.STRICT) {
      return (
        basePrompt +
        `

STRICT MODE:
- Be demanding about topic alignment and quality
- Penalize off-topic or irrelevant content
- Require minimum word count to be met
- Score: 80+ (Excellent), 60-79 (Good), 40-59 (Average), Below 40 (Poor)`
      );
    } else {
      return (
        basePrompt +
        `

LOOSE MODE:
- Reward effort and partial relevance
- Be flexible with structure if content is good
- Appreciate attempts at the topic
- Score: 70+ (Good), 50-69 (Acceptable), 30-49 (Needs Improvement), Below 30 (Poor)`
      );
    }
  }

  private buildUserPrompt(data: EvaluationPromptData): string {
    return `Assignment Instructions:
${data.instructions}

Minimum Word Count Required: ${data.minWords}
Total Marks: ${data.totalMarks}

Student Submission:
${data.studentContent}

Please evaluate this submission and provide your assessment in the specified JSON format.`;
  }

  private parseEvaluationResponse(
    content: string,
    totalMarks: number,
  ): {
    score: number;
    remarks: string;
    detailedFeedback: {
      topicRelevance: string;
      structure: string;
      contentQuality: string;
      wordCount: number;
      recommendation: string;
    };
  } {
    try {
      // Remove markdown code blocks if present
      let cleanContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const parsed = JSON.parse(cleanContent);

      // Validate required fields
      if (parsed.score === undefined || parsed.score === null) {
        throw new Error('AI response missing required "score" field');
      }

      // Validate score is a number
      if (typeof parsed.score !== 'number' || isNaN(parsed.score)) {
        throw new Error('AI score must be a valid number');
      }

      // Validate score is in range [0, 100]
      if (parsed.score < 0 || parsed.score > 100) {
        console.warn(
          `AI returned score ${parsed.score} out of range [0, 100]. Clamping to valid range.`,
        );
        parsed.score = Math.max(0, Math.min(100, parsed.score));
      }

      // Scale score to total marks
      const scaledScore = (parsed.score / 100) * totalMarks;

      return {
        score: Math.round(scaledScore * 10) / 10,
        remarks: parsed.remarks || 'Evaluation completed',
        detailedFeedback: {
          topicRelevance: parsed.topicRelevance || 'Not provided',
          structure: parsed.structure || 'Not provided',
          contentQuality: parsed.contentQuality || 'Not provided',
          wordCount: parsed.wordCount || 0,
          recommendation: parsed.recommendation || 'PENDING',
        },
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      throw new Error(`Invalid AI response format: ${error.message}`);
    }
  }
}