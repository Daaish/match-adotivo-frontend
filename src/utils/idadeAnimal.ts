// Calcula anos completos e, no primeiro ano, meses completos a partir da data informada — 18/11/2026.
export function formatarIdadeAnimal(nascimento: string | null, hoje = new Date()): string | null {
  if (!nascimento) return null
  const diaNascimento = new Date(nascimento.slice(0, 10))
  const ano = diaNascimento.getUTCFullYear()
  const mes = diaNascimento.getUTCMonth()
  const dia = diaNascimento.getUTCDate()
  const meses = (hoje.getFullYear() - ano) * 12 + hoje.getMonth() - mes -
    (hoje.getDate() < dia ? 1 : 0)

  if (!Number.isFinite(meses) || meses < 0) return null
  if (meses === 0) return 'Menos de um mês'
  if (meses === 1) return '1 mês'
  if (meses < 12) return `${meses} meses`
  const anos = Math.floor(meses / 12)
  return anos === 1 ? '1 ano' : `${anos} anos`
}
