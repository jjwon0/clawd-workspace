---
name: copilot-money-categorize
description: |
  ⚠️ CRITICAL: Process transactions ONE AT A TIME. Never use bulk selection.
  ⚠️ CRITICAL: When uncertain about ANY aspect, DO NOT take action - skip for manual review.

  Review and categorize transactions on Copilot Money (app.copilot.money) using browser automation.
  Processes unreviewed transactions from July 2025 onwards, ONE transaction at a time:
  - First discovers available categories from Copilot's category list
  - Analyzes each transaction using: name + Copilot's suggested category + amount
  - Only acts when HIGH confidence - skips anything uncertain
  - Marks transfers between accounts as "Internal transfer" (right-click → Change type)
  - Leaves Venmo P2P payments unreviewed for manual review
  - Flags large/unusual transactions for user attention
  - Never bulk selects - always processes individually

  Triggers:
  - "categorize my transactions"
  - "categorize copilot money"
  - "review my transactions"
  - "run copilot categorization"
  - Daily cron job for transaction review

  Configuration:
  - max_transactions: Number of transactions to process (default: 25)
---

## Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| `max_transactions` | 25 | Maximum number of transactions to process in one run. Prevents timeout on large backlogs. |

**Usage examples:**
- "categorize my transactions" → processes up to 25 transactions
- "categorize 10 transactions" → processes up to 10 transactions
- "categorize all my transactions" → processes up to 100 transactions (safety cap)

# Copilot Money Transaction Categorization

## Overview

**CRITICAL: This skill MUST process transactions ONE AT A TIME. Never use bulk selection.**
**CRITICAL: When uncertain about ANY decision, DO NOT take action. Skip for manual review.**

This skill automates reviewing transactions on Copilot Money by:
1. **Discovering categories**: First, learn what categories exist in the user's Copilot setup
2. Navigating to the transactions page with date filter (July 2025 cutoff)
3. Finding ONE unreviewed transaction from July 2025 onwards
4. **Analyzing with FOUR signals**: transaction name + Copilot's suggested category + amount + source account
5. Processing that SINGLE transaction ONLY if confident:
   - Determine if it's a transfer, Venmo P2P, or regular expense
   - Validate or update category using Copilot's available categories
   - Mark money movements between YOUR accounts as "Internal transfer" (right-click → Change type)
   - Leave Venmo P2P payments ("Venmo to [name]") unreviewed for manual review
   - **Skip if uncertain** - do not mark as reviewed
6. Repeat for each unreviewed transaction individually (never bulk select)
7. Flag large ($500+) or unusual transactions for manual review
8. Leave unclear transactions unprocessed for manual review
9. Report results with any items needing user attention

## Workflow

**⚠️ CRITICAL: NEVER BULK SELECT. Process ONE transaction at a time.**
**⚠️ CRITICAL: If uncertain, SKIP. Better to leave for manual review than miscategorize.**

### Step 1: Discover Available Categories

Before processing any transactions, learn what categories exist:
1. Click on any transaction to open the detail panel
2. Click on the category field to see the dropdown of available categories
3. **Record all available categories** - these are the ONLY categories you can use
4. Note any category groups/hierarchy (e.g., "Food & Dining" may have subcategories)
5. Close the dropdown

**Important**: Do NOT assume categories exist. Only use categories you see in Copilot's list.

### Step 2: Navigate to Transactions
Go to `https://app.copilot.money/transactions`

### Step 3: Set Date Filter
- Use the date filter to set cutoff to July 1, 2025
- Only process transactions from July 2025 onwards
- Skip any transaction before this date

### Step 4: Find ONE Unreviewed Transaction
Look for the FIRST unreviewed transaction in the list (newest first).
- Look for transactions without the "reviewed" indicator
- Select THIS ONE transaction only
- Scroll down to find more as needed (one at a time)

### Step 5: Analyze Each Unreviewed Transaction

**For each transaction, consider ALL FOUR signals together:**

1. **Transaction Name**: What merchant/description is shown?
2. **Copilot's Suggested Category**: What did Copilot auto-assign? (This is your starting point, not gospel)
3. **Amount**: Does the amount make sense for this type of transaction?
4. **Source Account**: Which account is this transaction from? (visible in the transaction row)

**Account Type Hints:**
- **Credit card** transactions → Almost always regular expenses (NOT internal transfers)
- **Checking/Savings account** transactions → Could be expenses OR internal transfers
  - If name suggests money movement (transfer, deposit, withdrawal) → Likely internal transfer
  - If name suggests a merchant/purchase → Regular expense

**Decision Framework:**

| Signal Agreement | Action |
|-----------------|--------|
| All 4 signals align (name matches category, amount reasonable, account type fits) | ✅ Mark as reviewed |
| Name clearly indicates different category than suggested | ✅ Change category, then mark reviewed |
| Checking/savings + transfer-like name → Internal transfer | ✅ Change type to "Internal transfer" |
| Credit card + transfer-like name → Suspicious | ⚠️ SKIP - something's off |
| Name is ambiguous but category seems plausible | ⚠️ SKIP - leave for manual review |
| Amount seems unusual for the category | ⚠️ SKIP - flag for user |
| Any uncertainty at all | ⚠️ SKIP - leave for manual review |

**Transaction Types:**

**A) Money Movement (Internal Transfer)**
If the transaction describes moving money between YOUR accounts:
- **Account signal**: Transaction is from a checking or savings account (NOT a credit card)
- **Name keywords**: "transfer", "deposit", "withdrawal", "balance rule", "payroll", bank names
- Look for transactions between known accounts (bank names in transaction)
- **Confidence check**: Is it from checking/savings AND clearly a transfer between your own accounts?
- Action: RIGHT-CLICK the transaction → "Change type" → "Internal transfer"
- **If from credit card**: Almost certainly NOT an internal transfer - skip or categorize as expense
- If uncertain whether it's a transfer: SKIP

**B) Venmo P2P Payments (NOT Transfers!)**
Venmo payments TO a person (e.g., "Venmo to Franklin Yin", "Venmo to @name") are **NOT transfers** - they're expenses for a purpose:
- These are real expenses (shared trips, group purchases, reimbursements)
- Action: Leave unreviewed for manual categorization
- Flag to user: "Venmo to [name] - $X.XX - needs manual review"
- Exception: "Venmo Venmo @jasonjwon" (Venmo to YOURSELF) IS a self-transfer → Change type to "Internal transfer"

**C) Expense to Categorize**
For regular expenses, use the FOUR signal analysis:

1. Look at transaction name - what merchant/service is it?
2. Look at Copilot's suggested category - does it make sense?
3. Look at amount - is it reasonable for this type of purchase?
4. Look at source account - credit card purchases are typical expenses

**Only change category if:**
- You are HIGHLY confident the current category is wrong
- The correct category clearly exists in Copilot's category list
- The transaction name unambiguously indicates a different category

**Keep Copilot's category if:**
- It seems reasonable even if not perfect
- You're not 100% sure of a better option
- The transaction name is ambiguous

**SKIP (leave unreviewed) if:**
- Transaction name is unclear or unfamiliar
- Multiple categories could apply
- Amount seems unusual
- Any doubt whatsoever

**D) Large or Unusual Transaction**
Flag for user review if:
- Amount >= $500 (large purchase)
- Amount is unusual for the category
- Merchant name is unfamiliar or suspicious
- Action: NOTE this to the user, DO NOT mark as reviewed

**E) Unclear Transaction**
SKIP (leave unprocessed) if:
- Merchant name is unclear or ambiguous
- You have ANY uncertainty about the category
- Transaction appears to be an error or test
- Copilot's category seems wrong but you're not sure what's right
- Action: SKIP (leave unreviewed for manual review)

### Step 6: Process THIS ONE Transaction (Only if Confident)

For the current transaction only:
1. Apply FOUR signal analysis (name + category + amount + account)
2. **If confident it's a transfer**: RIGHT-CLICK → "Change type" → "Internal transfer"
3. **If confident category is correct**: Mark as reviewed (no change needed)
4. **If confident category is wrong AND you know the right one**: Change category, then mark reviewed
5. **If Venmo P2P**: Leave unreviewed, note to user
6. **If ANY uncertainty**: DO NOT mark as reviewed, move to next transaction

### Step 7: Mark as Reviewed (Only if Confident)

**Only mark as reviewed if you are confident in the categorization.**

After processing THIS transaction (if confident):
1. Click the transaction to select it
2. Click the "Review" button in the toolbar
3. Verify this ONE transaction shows as reviewed

**If not confident: DO NOT mark as reviewed. Move to next transaction.**

### Step 8: Repeat for Next Unreviewed Transaction

1. Scroll/find the next unreviewed transaction
2. Repeat Steps 5-7 for THIS next transaction
3. Continue until all unreviewed transactions (from July 2025+) are processed
4. Stop after reaching `max_transactions` limit (default: 25)

### Step 9: Report Results

After processing all transactions (one at a time):
Summarize:
- Total unreviewed transactions found
- **Processed with confidence** (categorized + reviewed) - ONE AT A TIME
- Marked as internal transfers
- **Skipped due to uncertainty** (left unreviewed for manual review)
- Left unreviewed (Venmo P2P, unclear - for manual review)
- **Flagged items**: Large/unusual transactions needing user attention
- Categories used (from Copilot's actual category list)

## CRITICAL RULES

### WHEN UNCERTAIN, DO NOT ACT
- **If you have ANY doubt, skip the transaction**
- Better to leave 10 transactions for manual review than miscategorize 1
- The user can always review skipped transactions manually
- Only act when you have HIGH confidence

### NEVER BULK SELECT
- **NEVER select multiple transactions at once**
- **NEVER use "Select All" or checkboxes for bulk operations**
- Process ONE transaction at a time, from top to bottom
- Each transaction requires individual analysis and decision

### Use Copilot's Categories
- **Only use categories that exist in Copilot's dropdown**
- Discover categories FIRST before processing transactions
- Do not assume or guess category names
- Copilot's suggested category is your starting point - only override with confidence

### FOUR Signal Analysis
For EACH transaction, always consider:
1. **Transaction name**: What does it say?
2. **Copilot's category**: What did Copilot suggest?
3. **Amount**: Does it make sense?
4. **Source account**: Checking/savings vs credit card?

If these don't clearly align → SKIP

**Internal transfer hint**: Checking/savings account + transfer-like name = likely internal transfer

### Date Cutoff
- Only process transactions from July 2025 onwards
- Set the date filter before starting
- Skip any transaction before July 2025

### Processing Each Transaction
For EACH unreviewed transaction (one at a time):
1. Apply FOUR signal analysis (name + category + amount + account)
2. Check if it's a transfer (checking/savings + transfer-like name) → Right-click → Change type → "Internal transfer" (if confident)
3. Check if it's Venmo P2P → Leave unreviewed, flag to user
4. Check if it's a regular expense → Validate category against Copilot's list
5. **Only if confident**: Mark that ONE transaction as reviewed
6. **If uncertain**: Skip, move to next transaction

### Other Rules
- **Internal transfers**: Right-click → "Change type" → "Internal transfer" (not "Exclude")
- **Venmo P2P is NOT a transfer**: "Venmo to [name]" payments are real expenses - leave unreviewed, flag for user
- **Venmo self-transfer**: "Venmo Venmo @jasonjwon" IS a transfer - right-click → Change type to "Internal transfer"
- **Flag large transactions**: Anything $500+ needs user attention - do NOT mark as reviewed
- **Skip unclear transactions**: Any uncertainty = leave unreviewed
- **Skip very small amounts**: Transactions under $0.20 are likely micro-transactions or errors - skip these
- **Pagination**: Check multiple pages to find all unreviewed transactions (one at a time)
- **Review mode**: Some transactions may be "pending" - skip those
- **Chrome profile**: Use Chrome with Copilot Money already logged in

## Daily Run Configuration

For daily async runs (ONE TRANSACTION AT A TIME):
1. Navigate to transactions page
2. **Discover available categories** from Copilot's category dropdown
3. Set date filter to July 1, 2025 (only process transactions from July 2025 onwards)
4. Find the FIRST unreviewed transaction
5. Process THIS ONE transaction using FOUR signal analysis (name + category + amount + account):
   - Transfer (checking/savings + transfer-like name, confident) → Right-click → Change type → "Internal transfer"
   - Venmo P2P → Leave unreviewed, flag to user
   - Expense (confident) → Validate category, mark reviewed
   - **Uncertain → SKIP, do not mark reviewed**
6. Find the NEXT unreviewed transaction
7. Repeat Step 5 for this next transaction
8. Continue until `max_transactions` reached OR no more unreviewed transactions
9. Flag any large ($500+) or unusual transactions for user review
10. Report what was done, including:
    - Transactions processed with confidence
    - **Transactions skipped due to uncertainty** (user should review these)
    - Flagged items needing user attention

## Confidence Guidelines

**HIGH confidence (OK to act):**
- Transaction name clearly matches a known merchant type
- Copilot's category aligns with the merchant
- Amount is typical for this type of purchase
- Account type makes sense (credit card for purchases, checking for transfers)
- Example: "Whole Foods Market" → "Groceries" → $87.32 → Credit Card ✅
- Example: "Transfer to Savings" → Checking → $500.00 → Change type to "Internal transfer" ✅

**MEDIUM confidence (SKIP):**
- Transaction name is somewhat clear but category could go multiple ways
- Copilot's category seems plausible but you're not sure
- Example: "Amazon" → "Shopping" → $45.00 → Credit Card (could be groceries, electronics, anything)

**LOW confidence (SKIP):**
- Transaction name is ambiguous or unfamiliar
- Copilot's category seems wrong but you're not sure what's right
- Amount is unusual
- Account type doesn't match expected pattern
- Example: "SQ *COFFEE" → "Shopping" → $127.00 → Credit Card (weird amount for coffee)
- Example: "Transfer" → Credit Card → $200.00 (transfers don't happen on credit cards - suspicious)

**When in doubt, SKIP. The user will thank you for not miscategorizing.**
