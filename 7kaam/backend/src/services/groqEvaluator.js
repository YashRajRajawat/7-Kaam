/**
 * Groq AI Evaluator — evaluates trade test answers using llama-3.1-8b-instant
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.1-8b-instant';

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
    console.error('Groq evaluation failed:', err.message);
    // No mock fallback — a failed evaluation must surface as a real error,
    // not a fabricated score. Caller is responsible for returning a 502.
    const evalError = new Error(`Groq evaluation failed: ${err.message}`);
    evalError.code = 'GROQ_EVALUATION_FAILED';
    throw evalError;
  }
}

module.exports = { evaluateTestWithGroq };
