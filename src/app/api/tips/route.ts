import { NextRequest, NextResponse } from 'next/server';
import { queries, ensureInitialized } from '@/lib/database';
import { getSessionUser } from '@/lib/auth';

// POST /api/tips - Send a tip
export async function POST(request: NextRequest) {
  try {
    // Ensure database is initialized
    ensureInitialized();
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { article_id, to_user_id, amount, message } = await request.json();

    // Validate input
    if (!article_id || !to_user_id || !amount) {
      return NextResponse.json({ 
        error: 'Missing required fields: article_id, to_user_id, amount' 
      }, { status: 400 });
    }

    if (amount < 10) {
      return NextResponse.json({ error: 'Minimum tip amount is 10 M-Coin' }, { status: 400 });
    }

    if (sessionUser.id === to_user_id) {
      return NextResponse.json({ error: 'Cannot tip yourself' }, { status: 400 });
    }

    // Check if article exists and get author
    const article = queries.getArticleById.get(article_id);
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Check if to_user_id is the article author
    if (article.author_id !== to_user_id) {
      return NextResponse.json({ error: 'Can only tip the article author' }, { status: 400 });
    }

    // Get sender's current currency
    const senderCurrency = queries.getUserCurrency.get(sessionUser.id);
    if (!senderCurrency || senderCurrency.currency1 < amount) {
      return NextResponse.json({ 
        error: 'Insufficient M-Coin balance',
        required: amount,
        available: senderCurrency?.currency1 || 0
      }, { status: 400 });
    }

    // Calculate system fee (10%) and net amount
    const systemFee = Math.floor(amount * 0.1);
    const netAmount = amount - systemFee;

    // Get recipient's current currency
    const recipientCurrency = queries.getUserCurrency.get(to_user_id);
    if (!recipientCurrency) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
    }

    // Perform the transaction
    try {
      // Deduct from sender
      const newSenderBalance = senderCurrency.currency1 - amount;
      queries.updateUserCurrency.run(newSenderBalance, sessionUser.id);

      // Add to recipient (net amount after system fee)
      const newRecipientBalance = recipientCurrency.currency1 + netAmount;
      queries.updateUserCurrency.run(newRecipientBalance, to_user_id);

      // Record the tip
      const tipResult = queries.insertTip.run(
        article_id,
        sessionUser.id,
        to_user_id,
        amount,
        systemFee,
        netAmount,
        message || null
      );

      // Get the created tip with user details
      const tipId = tipResult.lastInsertRowid;
      const tipWithDetails = queries.getArticleTips.all(article_id)
        .find((tip: any) => tip.id === tipId);

      return NextResponse.json({
        success: true,
        tip: tipWithDetails,
        balances: {
          sender: newSenderBalance,
          recipient: newRecipientBalance
        }
      });

    } catch (error) {
      console.error('Transaction error:', error);
      return NextResponse.json({ error: 'Transaction failed' }, { status: 500 });
    }

  } catch (error) {
    console.error('Tip creation error:', error);
    return NextResponse.json({ error: 'Failed to process tip' }, { status: 500 });
  }
}

// GET /api/tips?article_id=123 - Get tips for an article
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const articleId = url.searchParams.get('article_id');

    if (!articleId) {
      return NextResponse.json({ error: 'article_id parameter required' }, { status: 400 });
    }

    // Get tips for the article
    const tips = queries.getArticleTips.all(parseInt(articleId));
    const stats = queries.getTipStats.get(parseInt(articleId));

    return NextResponse.json({
      tips,
      stats: stats || {
        total_tips: 0,
        total_amount: 0,
        total_fees: 0,
        total_net: 0
      }
    });

  } catch (error) {
    console.error('Error fetching tips:', error);
    return NextResponse.json({ error: 'Failed to fetch tips' }, { status: 500 });
  }
}