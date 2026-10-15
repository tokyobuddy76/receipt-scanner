# Receipt Scanner - Prompt History

This document contains all prompts submitted during the development and iteration of the Receipt Scanner application.

---

## Prompt 1: Initial Application Specification

Build a simple responsive web app called "Receipt Scanner".

### PURPOSE
The app allows a user to upload or take a photo of a receipt. Use Gemini's multimodal vision capabilities to analyze the receipt image and extract structured information. Display the extracted information clearly in the app UI.

### MAIN USER FLOW

1. The home screen should have:
   - App title: "Receipt Scanner"
   - Subtitle: "Upload a receipt to automatically extract the details."
   - A large upload area
   - "Upload Receipt" button
   - Support JPG, JPEG, PNG and HEIC if possible
   - On mobile, allow the user to take a photo using the camera
   - Show a preview of the uploaded receipt

2. After a receipt is uploaded:
   - Show a button called "Analyze Receipt"
   - Show a loading state while Gemini analyzes the image
   - Display "Analyzing receipt..." with a loading indicator
   - Disable the analyze button while processing

3. Send the receipt image to Gemini and ask it to extract:
   - Merchant / store name
   - Date
   - Time
   - Currency
   - Subtotal
   - Tax / GST
   - Service charge
   - Discount
   - Total price
   - Payment method if visible
   - Receipt / transaction number if visible

   Also extract every purchased item:
   - Item name
   - Quantity
   - Unit price, if available
   - Total item price

4. Gemini must return structured JSON using this schema:
```json
{
  "merchant": "",
  "date": "",
  "time": "",
  "currency": "",
  "subtotal": null,
  "tax": null,
  "serviceCharge": null,
  "discount": null,
  "total": null,
  "paymentMethod": "",
  "receiptNumber": "",
  "items": [
    {
      "name": "",
      "quantity": 1,
      "unitPrice": null,
      "totalPrice": null
    }
  ]
}
```

### RECEIPT ANALYSIS RULES
- Only extract information that can reasonably be determined from the receipt.
- Do not invent missing information.
- If a text field cannot be determined, return an empty string.
- If a numeric field cannot be determined, return null.
- Preserve the currency shown on the receipt.
- Prices should be returned as numbers without currency symbols.
- For dates, convert to YYYY-MM-DD when the date can be confidently interpreted.
- For time, use HH:MM in 24-hour format when possible.
- Do not confuse subtotal with the final total.
- The final total should represent the amount actually charged after taxes, discounts and service charges.
- If quantity is not explicitly shown but an item clearly appears once, quantity can be 1.
- If an item line is unclear, extract the most likely visible item name but do not hallucinate details.
- Ignore non-purchased content such as advertisements, loyalty messages, QR codes, promotional text and store policies.
- Return JSON only from the receipt analysis function.

### RESULT SCREEN
After analysis, show a clean results screen.

At the top display:
- Merchant: `[Merchant Name]`
- Date: `[Date]`
- Time: `[Time]`
- Total: `[Currency] [Total]`

Then show an "Items" section as a table:
`Item | Qty | Unit Price | Total`

Example:
- Chicken Rice | 2 | $5.50 | $11.00
- Coffee | 1 | $2.50 | $2.50

Below the items show:
- Subtotal
- Tax / GST
- Service Charge
- Discount
- Total (Make the Total visually prominent)

### EDITING
All extracted information should be editable because AI extraction may occasionally be incorrect.

Allow the user to:
- Edit merchant
- Edit date
- Edit time
- Edit prices
- Edit item names
- Edit quantities
- Add an item
- Delete an item

Include:
- "Save Receipt" button
- "Scan Another Receipt" button

### UI DESIGN
Use a modern, simple and clean interface.
- White/light background
- Rounded cards
- Subtle shadows
- Clear typography
- Plenty of spacing
- Mobile-first responsive layout

The receipt upload area should look like a large drag-and-drop card.

On desktop, after analysis, use a two-column layout:
- LEFT: Receipt image preview
- RIGHT: Extracted receipt information

On mobile, stack these vertically.

### ERROR HANDLING
If the image cannot be analyzed, show:
`"We couldn't read this receipt. Try taking a clearer photo or uploading another image."`

If only some information can be extracted, still display the available information and leave unknown fields blank.
Do not fail the entire analysis just because one field cannot be identified.

### IMPORTANT
The first version should be intentionally simple.
Do not add authentication, complicated dashboards, payment systems or unnecessary features.

Focus on making the core workflow work reliably:
`Upload Receipt → Analyze Image with Gemini → Receive Structured JSON → Display Results → Allow User Corrections → Save Receipt`

---

## Prompt 2: Push Initial Codebase to GitHub

```text
git push https://<GITHUB_PERSONAL_ACCESS_TOKEN>@github.com/tokyobuddy76/receipt-scanner.git
```

---

## Prompt 3: Analyze Receipt Verification

```text
use gemini to analyze the receipt
```

---

## Prompt 4: Strict Gemini Analysis Implementation Requirements

```text
IMPLEMENT GEMINI RECEIPT ANALYSIS

The receipt analysis must use the Gemini API and Gemini's multimodal image understanding capabilities.

Do NOT use mock data, hard-coded receipt values, fake analysis, or placeholder responses.

When the user uploads a receipt and clicks "Analyze Receipt":

1. Take the uploaded receipt image from the file input.

2. Send the actual image to a Gemini model that supports image/multimodal input.

3. Include the receipt image together with the following instruction:

"You are a receipt analysis system.

Carefully analyze the attached receipt image.

Extract all information that is clearly visible on the receipt.

Return:
- merchant/store name
- date
- time
- currency
- subtotal
- tax/GST
- service charge
- discount
- final total
- payment method
- receipt/transaction number
- every purchased item
- quantity of each item
- unit price of each item
- total price of each item

Do not guess information that is not visible.

If a text value cannot be determined, return an empty string.
If a numeric value cannot be determined, return null.

Return ONLY structured JSON."

4. Require Gemini to return JSON matching exactly this structure:

{
  "merchant": "",
  "date": "",
  "time": "",
  "currency": "",
  "subtotal": null,
  "tax": null,
  "serviceCharge": null,
  "discount": null,
  "total": null,
  "paymentMethod": "",
  "receiptNumber": "",
  "items": [
    {
      "name": "",
      "quantity": 1,
      "unitPrice": null,
      "totalPrice": null
    }
  ]
}

5. Use Gemini structured output / JSON schema functionality if supported by the selected Gemini model. Do not rely on extracting JSON from markdown.

6. Parse the Gemini response and populate the app UI with the returned data.

7. Display the actual extracted data from Gemini. Never substitute sample data if the API request fails.

8. If Gemini cannot confidently identify a field, display it as blank rather than inventing a value.

9. If the API call fails, display:
"Unable to analyze this receipt. Please try again."

10. Log useful API errors to the developer console for debugging, but do not expose API keys or sensitive configuration.

IMAGE HANDLING

The uploaded image must actually be included in the Gemini API request as image input.

Support:
- image/jpeg
- image/png
- image/webp

Convert the uploaded File into the format required by the Gemini API.

Preserve sufficient image quality for Gemini to read small receipt text.

Do not perform client-side compression that makes the receipt difficult to read.

SECURITY

Do not hard-code the Gemini API key directly into frontend source code.

Use the API key / Gemini integration provided by Google AI Studio where possible.

If a backend/server-side function is required to protect the API key, create the appropriate server-side Gemini request.

LOADING STATE

When the user clicks "Analyze Receipt":

1. Change the button to "Analyzing..."
2. Show a loading indicator.
3. Send the receipt image to Gemini.
4. Wait for Gemini's response.
5. Validate the returned JSON.
6. Populate the receipt details and item list.
7. Stop the loading indicator.

The app's receipt extraction functionality is not complete unless an actual uploaded receipt image is sent to Gemini and the Gemini response is used to populate the UI.
```

---

## Prompt 5: Switch AI Engine to Mistral

```text
instead of gemini, use mistral instead.
```

---

## Prompt 6: Add Serverless Connection in Root `/api`

```text
add a serverless connection.
- store this in /api folder (project root level) not the src folder
-include /health.ts and /receiptscanner.ts within that subfolder
- do not hardcode any key, I will include them later

POST https://api.mistral.ai/v1/chat/completions
# Authorization: Bearer <MISTRAL_API_KEY>
# Content-Type: application/json
{"model":"mistral-small-latest","messages":[{"role":"user","content":"hi"}]}
```

---

## Prompt 7: Collate All Prompts

```text
collate all the prompts so far and store them in a prompt.md file
```
