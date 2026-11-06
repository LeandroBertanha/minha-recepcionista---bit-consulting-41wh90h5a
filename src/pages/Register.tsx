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
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { BrandLogo } from '@/components/BrandLogo'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const newErrors: Record<string, string> = {}

    if (password !== passwordConfirm) {
      newErrors.passwordConfirm = 'As senhas não coincidem'
    }

    if (password.length < 8) {
      newErrors.password = 'A senha deve ter pelo menos 8 caracteres'
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Por favor, insira um endereço de e-mail válido'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)
    const { error } = await signUp(email, password, passwordConfirm, name)
    setLoading(false)

    if (error) {
      const fieldErrors = extractFieldErrors(error)
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors)
      } else {
        toast({
          variant: 'destructive',
          title: 'Falha no cadastro',
          description: error.message || 'Ocorreu um erro inesperado.',
        })
      }
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
          <h1 className="text-2xl font-extrabold tracking-tight text-bit-navy">Criar uma conta</h1>
          <p className="text-slate-500">Comece a conectar seu WhatsApp hoje</p>
        </div>

        <Card className="relative border-slate-200/80 shadow-xl shadow-brand-900/10">
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Cadastrar-se</CardTitle>
              <CardDescription>Insira seus dados para criar sua conta</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  placeholder="Seu nome"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="focus-visible:ring-brand-500"
                />
                {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
              </div>
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
                {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
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
                {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="passwordConfirm">Confirmar Senha</Label>
                <Input
                  id="passwordConfirm"
                  type="password"
                  required
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  className="focus-visible:ring-brand-500"
                />
                {errors.passwordConfirm && (
                  <p className="text-xs text-red-500">{errors.passwordConfirm}</p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button
                type="submit"
                className="w-full bg-brand-500 hover:bg-brand-600 text-white shadow-sm shadow-brand-500/20"
                disabled={loading}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Criar Conta
              </Button>
              <div className="text-center text-sm text-slate-500">
                Já possui uma conta?{' '}
                <Link
                  to="/login"
                  className="font-semibold text-brand-700 hover:text-brand-800 hover:underline"
                >
                  Entrar
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
