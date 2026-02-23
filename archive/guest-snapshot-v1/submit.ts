import type { Handler } from '@netlify/functions';

interface GuestResponses {
  guest_name: string;
  q1_conventional_success: string;
  q2_life_stage: string;
  q3_tradeoff: string;
  q4_paths: string;
  q5_success: string;
  q6_protect: string;
  q7_changed_mind: string;
  q8_pull: string;
  q9_word: string;
  q10_rethinking: string;
}

interface DimensionScore {
  score: number;
  justification: string;
}

interface ScoringResult {
  guest_name: string;
  archetype: string;
  dimensions: {
    tradeoff_awareness: DimensionScore;
    unresolved_tension: DimensionScore;
    self_awareness: DimensionScore;
    specificity: DimensionScore;
    conversation_potential: DimensionScore;
  };
  composite_score: number;
  tier: 'Strong Fit' | 'Worth Exploring' | 'Likely Not a Fit';
  soft_flags: string[];
  summary: string;
  suggested_angles: string[];
}

const QUESTION_LABELS: Record<string, string> = {
  q1_conventional_success: 'Relationship with conventional success',
  q2_life_stage: 'Where they are right now',
  q3_tradeoff: 'What they gave up (decision that shaped their life)',
  q4_paths: 'Feeling about paths not taken',
  q5_success: 'Version of success that feels most real',
  q6_protect: 'What they\'d protect if recognition disappeared',
  q7_changed_mind: 'Changed belief about success/money/ambition',
  q8_pull: 'Where money/status/recognition still pull',
  q9_word: 'Word occupying more of their thinking',
  q10_rethinking: 'Lately, I\'ve been rethinking...',
};

const SYSTEM_PROMPT = `You are evaluating a podcast guest questionnaire for "Question Everything (Except This Podcast!)," a philosophy podcast exploring how people make meaning in a world that relentlessly measures success through money, status, and scale.

The podcast centers on the cost of choice. We speak with people who made deliberate decisions about what not to pursue — and who accepted the tradeoffs that followed. We're also interested in people still playing the capitalism game but questioning it, and people who achieved conventional success but feel something is incomplete.

We care about: the paths not taken, the incentives resisted, the moral/emotional/practical tradeoffs people live with, quiet work that sustains communities, and how meaning is built when applause is absent.

This is not a podcast about heroes, purity, or perfect answers. It's about responsibility, ambiguity, and lived decisions.

## Scoring Rubric

Score each dimension 1-5:

1. **Tradeoff Awareness** (Weight: 30%)
   - Can they name what they gave up? Do they feel the cost, not just describe it?
   - Strong: specific, emotionally resonant, names real consequences
   - Weak: abstract, generic, or treats tradeoffs as fully resolved
   - Primarily scored from: Q3 (what they gave up), Q4 (feelings about paths not taken), Q7 (changed beliefs)

2. **Unresolved Tension** (Weight: 25%)
   - Are they still wrestling with something? Or is everything neatly resolved?
   - Strong: admits ambivalence, acknowledges ongoing pull, holds contradictions
   - Weak: everything is wrapped up, no loose ends, too clean a narrative
   - Primarily scored from: Q4 (paths not taken feeling), Q8 (where status still pulls), Q10 (what they're rethinking)

3. **Self-Awareness** (Weight: 20%)
   - Do they see their own contradictions? Can they hold two truths at once?
   - Strong: acknowledges where values and actions don't align, sees their own patterns
   - Weak: self-image is seamless, no cracks visible
   - Primarily scored from: Q1 (relationship with success), Q7 (changed beliefs), Q8 (the pull)

4. **Specificity** (Weight: 15%)
   - Concrete decisions, moments, consequences — or vague platitudes?
   - Strong: names specific events, people, amounts, timelines, emotions
   - Weak: speaks in generalities, abstractions, or borrowed language
   - Primarily scored from: Q3, Q7, Q8, Q10 (all open-text responses)

5. **Conversation Potential** (Weight: 10%)
   - Would their responses lead to a rich, surprising episode?
   - Strong: unexpected angles, genuine vulnerability, would make listeners reconsider their own assumptions
   - Weak: predictable narrative, advice-mode, nothing that surprises
   - Holistic impression across all questions

## Archetype Classification (from Q1, informational only — does not affect scoring)
- "Pursued it and achieved it, but something still feels incomplete" → Successful Questioner
- "Stepped away from it deliberately" → Walk-Away
- "Still in it, but increasingly questioning why" → Trapped Seeker
- "Never fit the conventional definition to begin with" → Outsider / Non-Conformist
- "It's complicated — not sure which of these is true" → Self-Aware / Unclassified

## Scoring Scale
5 = Exceptional signal. This dimension alone would make them worth talking to.
4 = Strong. Clear evidence of depth.
3 = Present but surface-level. Could go either way in conversation.
2 = Weak. Responses feel rehearsed, generic, or overly tidy.
1 = Absent or counter-signal.

## Composite Score Calculation
Weighted average: (tradeoff_awareness × 0.30) + (unresolved_tension × 0.25) + (self_awareness × 0.20) + (specificity × 0.15) + (conversation_potential × 0.10)

## Tier Thresholds
- Strong Fit: 4.0+
- Worth Exploring: 3.0–3.9
- Likely Not a Fit: Below 3.0

## Soft Flags (note any that apply)
- All radio answers are comfortable/safe options with no edge
- Open text responses are short or abstract
- Everything is resolved with no ambivalence or lingering cost
- Responses have a promotional or self-branding tone
- Narrative is too polished or rehearsed`;

function buildUserPrompt(responses: GuestResponses): string {
  const lines = [`Guest Name: ${responses.guest_name}`, ''];

  const keys = Object.keys(QUESTION_LABELS) as (keyof typeof QUESTION_LABELS)[];
  for (const key of keys) {
    const value = responses[key as keyof GuestResponses] || '(no response)';
    lines.push(`**${QUESTION_LABELS[key]}:**`);
    lines.push(value);
    lines.push('');
  }

  return `Score the following guest questionnaire responses:\n\n${lines.join('\n')}`;
}

function buildScoringEmail(scoring: ScoringResult, responses: GuestResponses): string {
  const tierColor = scoring.tier === 'Strong Fit' ? '#059669'
    : scoring.tier === 'Worth Exploring' ? '#d97706'
    : '#dc2626';

  const tierBg = scoring.tier === 'Strong Fit' ? '#ecfdf5'
    : scoring.tier === 'Worth Exploring' ? '#fffbeb'
    : '#fef2f2';

  const dimensionRows = [
    { name: 'Tradeoff Awareness', weight: '30%', data: scoring.dimensions.tradeoff_awareness },
    { name: 'Unresolved Tension', weight: '25%', data: scoring.dimensions.unresolved_tension },
    { name: 'Self-Awareness', weight: '20%', data: scoring.dimensions.self_awareness },
    { name: 'Specificity', weight: '15%', data: scoring.dimensions.specificity },
    { name: 'Conversation Potential', weight: '10%', data: scoring.dimensions.conversation_potential },
  ].map(d => `
    <tr>
      <td style="padding: 10px 12px; border-bottom: 1px solid #f0ede6; font-weight: 500;">${d.name} <span style="color: #9b9bab; font-weight: 400;">(${d.weight})</span></td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #f0ede6; text-align: center; font-weight: 600; font-size: 1.1em;">${d.data.score}/5</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #f0ede6; color: #6b6b7b; font-size: 0.9em;">${d.data.justification}</td>
    </tr>
  `).join('');

  const flagsHtml = scoring.soft_flags.length > 0
    ? `<div style="background: #fffbeb; border-left: 3px solid #d97706; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
        <strong style="color: #92400e;">Flags:</strong>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #92400e;">${scoring.soft_flags.map(f => `<li>${f}</li>`).join('')}</ul>
      </div>`
    : '';

  const anglesHtml = scoring.suggested_angles.length > 0
    ? `<div style="margin-top: 16px;">
        <strong>Suggested Conversation Angles:</strong>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #4b5563;">${scoring.suggested_angles.map(a => `<li>${a}</li>`).join('')}</ul>
      </div>`
    : '';

  const responsesHtml = Object.entries(QUESTION_LABELS).map(([key, label]) => {
    const value = responses[key as keyof GuestResponses] || '(no response)';
    return `<p style="margin: 0 0 12px 0;"><strong style="color: #1a1a2e;">${label}:</strong><br/><span style="color: #4b5563;">${value}</span></p>`;
  }).join('');

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 680px; margin: 0 auto; padding: 24px; background: #faf9f6; color: #1a1a2e;">
      <h1 style="font-family: Georgia, serif; font-weight: 400; font-size: 1.5em; margin-bottom: 4px;">Guest Snapshot: ${scoring.guest_name}</h1>
      <p style="color: #9b9bab; margin-top: 0; font-size: 0.9em;">Question Everything Questionnaire Scoring</p>

      <!-- Tier Badge -->
      <div style="background: ${tierBg}; border: 1px solid ${tierColor}30; border-radius: 8px; padding: 16px 20px; margin: 20px 0; display: flex; align-items: center;">
        <div>
          <span style="font-size: 0.8em; text-transform: uppercase; letter-spacing: 0.05em; color: ${tierColor};">${scoring.tier}</span>
          <div style="font-size: 1.8em; font-weight: 600; color: ${tierColor};">${scoring.composite_score.toFixed(1)}<span style="font-size: 0.5em; font-weight: 400;">/5.0</span></div>
        </div>
        <div style="margin-left: 24px;">
          <span style="background: #1a1a2e; color: #faf9f6; padding: 3px 10px; border-radius: 12px; font-size: 0.8em;">${scoring.archetype}</span>
        </div>
      </div>

      <!-- Summary -->
      <p style="font-size: 1em; line-height: 1.6; color: #4b5563; margin: 16px 0;">${scoring.summary}</p>

      ${flagsHtml}

      <!-- Dimension Scores -->
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 0.9em;">
        <thead>
          <tr style="border-bottom: 2px solid #e0ddd6;">
            <th style="padding: 8px 12px; text-align: left; color: #9b9bab; font-weight: 500; font-size: 0.85em; text-transform: uppercase; letter-spacing: 0.03em;">Dimension</th>
            <th style="padding: 8px 12px; text-align: center; color: #9b9bab; font-weight: 500; font-size: 0.85em; text-transform: uppercase; letter-spacing: 0.03em;">Score</th>
            <th style="padding: 8px 12px; text-align: left; color: #9b9bab; font-weight: 500; font-size: 0.85em; text-transform: uppercase; letter-spacing: 0.03em;">Rationale</th>
          </tr>
        </thead>
        <tbody>${dimensionRows}</tbody>
      </table>

      ${anglesHtml}

      <!-- Raw Responses -->
      <details style="margin-top: 28px;">
        <summary style="cursor: pointer; font-weight: 600; color: #1a1a2e; margin-bottom: 12px;">Full Responses</summary>
        <div style="background: #fff; border: 1px solid #e0ddd6; border-radius: 8px; padding: 20px; margin-top: 8px;">
          ${responsesHtml}
        </div>
      </details>
    </div>
  `;
}

const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const responses: GuestResponses = JSON.parse(event.body || '{}');

    if (!responses.guest_name) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing guest name' }) };
    }

    const openrouterKey = process.env.OPENROUTER_API_KEY;
    const brevoKey = process.env.BREVO_API_KEY;
    const notificationEmail = process.env.NOTIFICATION_EMAIL || 'chirag.dilip.shah@gmail.com';

    if (!openrouterKey) {
      console.error('OPENROUTER_API_KEY not set');
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    }

    if (!brevoKey) {
      console.error('BREVO_API_KEY not set');
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error' }) };
    }

    // Call OpenRouter for scoring
    const llmResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://questioneverythingpodcast.com',
        'X-Title': 'Question Everything Guest Scoring',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-haiku',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(responses) },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'score_guest_questionnaire',
              description: 'Score a podcast guest questionnaire and return structured evaluation',
              parameters: {
                type: 'object',
                required: ['guest_name', 'archetype', 'dimensions', 'composite_score', 'tier', 'soft_flags', 'summary', 'suggested_angles'],
                properties: {
                  guest_name: {
                    type: 'string',
                    description: 'The guest\'s name',
                  },
                  archetype: {
                    type: 'string',
                    enum: ['Successful Questioner', 'Walk-Away', 'Trapped Seeker', 'Outsider / Non-Conformist', 'Self-Aware / Unclassified'],
                    description: 'Guest archetype based on Q1 response',
                  },
                  dimensions: {
                    type: 'object',
                    required: ['tradeoff_awareness', 'unresolved_tension', 'self_awareness', 'specificity', 'conversation_potential'],
                    properties: {
                      tradeoff_awareness: {
                        type: 'object',
                        required: ['score', 'justification'],
                        properties: {
                          score: { type: 'number', minimum: 1, maximum: 5, description: 'Score 1-5' },
                          justification: { type: 'string', description: '1-2 sentence rationale' },
                        },
                      },
                      unresolved_tension: {
                        type: 'object',
                        required: ['score', 'justification'],
                        properties: {
                          score: { type: 'number', minimum: 1, maximum: 5 },
                          justification: { type: 'string' },
                        },
                      },
                      self_awareness: {
                        type: 'object',
                        required: ['score', 'justification'],
                        properties: {
                          score: { type: 'number', minimum: 1, maximum: 5 },
                          justification: { type: 'string' },
                        },
                      },
                      specificity: {
                        type: 'object',
                        required: ['score', 'justification'],
                        properties: {
                          score: { type: 'number', minimum: 1, maximum: 5 },
                          justification: { type: 'string' },
                        },
                      },
                      conversation_potential: {
                        type: 'object',
                        required: ['score', 'justification'],
                        properties: {
                          score: { type: 'number', minimum: 1, maximum: 5 },
                          justification: { type: 'string' },
                        },
                      },
                    },
                  },
                  composite_score: {
                    type: 'number',
                    description: 'Weighted composite score (0.0-5.0)',
                  },
                  tier: {
                    type: 'string',
                    enum: ['Strong Fit', 'Worth Exploring', 'Likely Not a Fit'],
                    description: 'Recommendation tier based on composite score',
                  },
                  soft_flags: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Any concerning patterns noted (empty array if none)',
                  },
                  summary: {
                    type: 'string',
                    description: '2-3 sentence overall assessment of this guest\'s potential',
                  },
                  suggested_angles: {
                    type: 'array',
                    items: { type: 'string' },
                    minItems: 2,
                    maxItems: 4,
                    description: '2-4 specific conversation angles or threads to explore in the interview',
                  },
                },
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'score_guest_questionnaire' } },
      }),
    });

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      console.error('OpenRouter API error:', llmResponse.status, errorText);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Scoring service unavailable' }) };
    }

    const llmData = await llmResponse.json();
    const toolCall = llmData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error('No tool call in LLM response:', JSON.stringify(llmData));
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Scoring failed' }) };
    }

    const scoring: ScoringResult = JSON.parse(toolCall.function.arguments);

    // Send scored notification email via Brevo
    const tierEmoji = scoring.tier === 'Strong Fit' ? '🟢'
      : scoring.tier === 'Worth Exploring' ? '🟡'
      : '🔴';

    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': brevoKey,
      },
      body: JSON.stringify({
        to: [{ email: notificationEmail }],
        subject: `${tierEmoji} Guest Snapshot: ${scoring.guest_name} — ${scoring.tier} (${scoring.composite_score.toFixed(1)}/5.0)`,
        htmlContent: buildScoringEmail(scoring, responses),
      }),
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true }),
    };

  } catch (error) {
    console.error('Submission error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
    };
  }
};

export { handler };
