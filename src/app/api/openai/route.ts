import OpenAI from 'openai'
import { NextResponse } from 'next/server'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { prompt, image, productName, triggerWord } = body

    const imageUrl = image.startsWith('data:') 
      ? image 
      : `data:image/png;base64,${image}`

    const productDescription = productName || 'product'

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: `Please provide a detailed, clear description of this ${productDescription} image, yet only referring to the item as the trigger word "${triggerWord}". Describe the ${productName}'s appearance, focusing on its key features, colors, textures, and any notable visual elements. Keep the description concise but informative. Refer to the item only as "${triggerWord}".`
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high"
              }
            }
          ],
        },
      ],
      max_tokens: 300,
    })

    return NextResponse.json({ result: completion.choices[0].message.content })
  } catch (error) {
    console.error('OpenAI API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 