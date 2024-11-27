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
              text: `You a world-class Data labeler with pride on your attention to detail. You are captioning the following images of an object to train a diffusion LoRa. The object is ${productName}. Meticulously describe the scene of the image & how the ${productName} interacts with the scene, but do not describe the ${productName} itself. Rather than refering to the object by its name, please refer to it using the following trigger world: ${triggerWord}. Please try and use the trigger word at least twice in your caption.`
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