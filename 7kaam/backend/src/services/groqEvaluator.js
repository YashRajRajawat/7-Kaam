/**
 * Groq AI Evaluator — evaluates trade test answers using llama3-8b-8192
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama3-8b-8192';

async function evaluateTestWithGroq({ trade, testTitle, questions, answers }) {
  const questionsText = questions
    .map(
      (q, i) =>
        `Q${i + 1}: ${q.question}\nCorrect Answer: ${q.correctAnswer}\nWorker Answer: ${answers[i] || '(no answer)'}`
    )
    .join('\n\n');

  const userPrompt = `Trade: ${trade}
Test Title: ${testTitle}
Questions and Worker Answers:
${questionsText}

Return this exact JSON:
{
  "totalScore": <number 0-100>,
  "breakdown": [
    {"question": "...", "workerAnswer": "...", "score": <0-10>, "feedback": "..."}
  ],
  "overallFeedback": "..."
}`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You are an expert trade certification evaluator for Indian blue-collar workers. Evaluate the worker\'s answers strictly and fairly. Return ONLY valid JSON, no markdown, no explanation outside the JSON.',
          },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    const rawContent = data.choices[0].message.content.trim();

    // Strip markdown code fences if present
    const jsonStr = rawContent.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
    const evaluation = JSON.parse(jsonStr);
    return evaluation;
  } catch (err) {
    console.error('Groq evaluation failed, using mock:', err.message);
    // Fallback mock evaluation
    return {
      totalScore: Math.floor(Math.random() * 40) + 40,
      breakdown: questions.map((q, i) => ({
        question: q.question,
        workerAnswer: answers[i] || '(no answer)',
        score: Math.floor(Math.random() * 5) + 4,
        feedback: 'Groq evaluation unavailable — mock score assigned.',
      })),
      overallFeedback:
        'NOTE: This is a mock evaluation because Groq API was unavailable. Real scores may differ.',
    };
  }
}

module.exports = { evaluateTestWithGroq };
