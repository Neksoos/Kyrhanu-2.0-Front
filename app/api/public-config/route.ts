export const dynamic = 'force-dynamic'

export async function GET() {
  const tgBotUsername =
    process.env.NEXT_PUBLIC_TG_BOT_USERNAME ||
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ||
    ''

  const apiBase =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE ||
    ''

  return Response.json(
    { tgBotUsername, apiBase },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  )
}