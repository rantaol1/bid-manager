import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-arcwide-gray-light p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          Arcwide <span className="text-magenta">Bid Manager</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Create your account</p>
      </div>
      <SignUp appearance={{ variables: { colorPrimary: '#E6007E' } }} />
    </div>
  )
}
