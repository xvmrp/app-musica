import dynamic from 'next/dynamic'

const MaquetasApp = dynamic(
  () => import('../components/MaquetasApp'),
  { ssr: false }
)

export default function Home() {
  return <MaquetasApp />
}