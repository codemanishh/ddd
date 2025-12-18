import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface MenuItemForSuggestion {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  description: string | null;
  ingredients: string[] | null;
  price: string;
}

export interface SuggestionResult {
  suggestions: {
    itemId: string;
    itemName: string;
    reason: string;
  }[];
}

export async function getAIPairingSuggestions(
  selectedItem: MenuItemForSuggestion,
  availableMenuItems: MenuItemForSuggestion[],
  cartItemIds: string[] = []
): Promise<SuggestionResult> {
  const otherItems = availableMenuItems.filter(
    item => item.id !== selectedItem.id && !cartItemIds.includes(item.id)
  );

  if (otherItems.length === 0) {
    return { suggestions: [] };
  }

  const menuContext = otherItems.map(item => ({
    id: item.id,
    name: item.name,
    category: item.category,
    subcategory: item.subcategory,
    ingredients: item.ingredients?.join(", ") || "not specified",
  }));

  const prompt = `You are a food pairing expert for Indian restaurants and pubs. A customer has selected "${selectedItem.name}" (category: ${selectedItem.category}, ${selectedItem.subcategory || "general"}).
${selectedItem.ingredients?.length ? `Ingredients: ${selectedItem.ingredients.join(", ")}` : ""}
${selectedItem.description ? `Description: ${selectedItem.description}` : ""}

Based on typical Indian dining preferences and what pairs well together, suggest 2-3 complementary items from this menu that would go great with their selection:

Available Menu Items:
${JSON.stringify(menuContext, null, 2)}

Consider:
- If they ordered non-veg starters, suggest drinks (beer, whisky) or complementary dishes
- If they ordered liquor, suggest good snacks/starters
- Pair spicy foods with cooling drinks or raita-like items
- Suggest desserts/cakes after main courses
- Consider traditional Indian meal combinations

Respond with JSON in this exact format:
{
  "suggestions": [
    {"itemId": "actual-id-from-menu", "itemName": "Item Name", "reason": "Brief reason why this pairs well"}
  ]
}

Only include items from the provided menu. Return 2-3 suggestions maximum.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert at suggesting food and drink pairings for Indian cuisine in pubs and bars. Always respond with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      return { suggestions: [] };
    }

    const result = JSON.parse(content) as SuggestionResult;
    
    const validSuggestions = result.suggestions.filter(s => 
      otherItems.some(item => item.id === s.itemId)
    );

    return { suggestions: validSuggestions.slice(0, 3) };
  } catch (error) {
    console.error("OpenAI suggestion error:", error);
    return { suggestions: [] };
  }
}
