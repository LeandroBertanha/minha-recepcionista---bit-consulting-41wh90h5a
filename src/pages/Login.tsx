import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { BrandLogo } from '@/components/BrandLogo'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Falha no login',
        description: getErrorMessage(error),
      })
    } else {
      navigate('/connection-setup')
    }
  }

  return (
    <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-[linear-gradient(135deg,#effcfb_0%,#ffffff_52%,#eef8f2_100%)] px-4 py-12">
      <div className="absolute -left-24 top-20 h-64 w-64 rounded-full bg-brand-200/50 blur-3xl" />
      <div className="absolute -right-20 bottom-12 h-64 w-64 rounded-full bg-bit-green/10 blur-3xl" />
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="flex flex-col items-center mb-8">
          <Link
            to="/"
            className="mb-5 rounded-2xl bg-white px-5 py-2 shadow-sm ring-1 ring-slate-200/70"
          >
            <BrandLogo />
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight text-bit-navy">
            Bem-vindo de volta
          </h1>
          <p className="text-slate-500">Faça login para acessar sua caixa de entrada do WhatsApp</p>
        </div>

        <Card className="relative border-slate-200/80 shadow-xl shadow-brand-900/10">
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Entrar</CardTitle>
              <CardDescription>Insira seu e-mail e senha abaixo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="focus-visible:ring-brand-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="focus-visible:ring-brand-500"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button
                type="submit"
                className="w-full bg-brand-500 hover:bg-brand-600 text-white shadow-sm shadow-brand-500/20"
                disabled={loading}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Entrar
              </Button>
              <div className="text-center text-sm text-slate-500">
                Não possui uma conta?{' '}
                <Link
                  to="/register"
                  className="font-semibold text-brand-700 hover:text-brand-800 hover:underline"
                >
                  Cadastrar-se
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
