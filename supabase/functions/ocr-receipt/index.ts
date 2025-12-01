import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl } = await req.json();
    
    if (!imageUrl) {
      throw new Error("Image URL is required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Processing receipt OCR...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `আপনি একটি রশিদ থেকে তথ্য বের করার বিশেষজ্ঞ। এই রশিদ থেকে নিচের তথ্যগুলো বাংলায় বের করুন:
                
1. আইটেমের তালিকা (প্রতিটি আইটেমের নাম, পরিমাণ, মূল্য)
2. মোট মূল্য
3. তারিখ (যদি থাকে)
4. দোকানের নাম (যদি থাকে)

JSON format এ উত্তর দিন:
{
  "items": [
    {"name": "আইটেমের নাম বাংলায়", "quantity": "১", "price": 100}
  ],
  "total": 500,
  "date": "২০২৫-১২-০১",
  "shop": "দোকানের নাম"
}`
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }
      if (response.status === 402) {
        throw new Error("Payment required. Please add credits to your workspace.");
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI processing failed");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("No response from AI");
    }

    console.log("OCR response:", content);

    // Parse the JSON response
    let ocrData;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/```\n?([\s\S]*?)\n?```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      ocrData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      // Try to extract structured data from text
      ocrData = {
        items: [],
        total: 0,
        date: "",
        shop: "",
        rawText: content
      };
    }

    return new Response(
      JSON.stringify({ success: true, data: ocrData }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("OCR error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});