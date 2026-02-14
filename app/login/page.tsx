'use client'

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-start justify-center p-4 pixel-noise">
      <div className="pixel-border w-full max-w-md p-5">
        <h1 className="text-xl mb-4">Вхід паролем</h1>
        <p className="text-sm opacity-80 mb-4">
          Цю сторінку ще підключимо до бекенду (email/пароль). Поки що користуйся входом через Telegram.
        </p>

        <button className="pixel-btn pixel-btn-primary w-full" onClick={() => (window.location.href = '/')}>
          Назад
        </button>
      </div>
    </main>
  )
}