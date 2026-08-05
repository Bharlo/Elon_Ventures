import { useState } from 'react'

const supportNumber = '14356122257'

export default function InvestmentInquiry() {
  const [step, setStep] = useState(1)
  const [details, setDetails] = useState({ name: '', email: '', phone: '', address: '' })
  const update = (field, value) => setDetails(current => ({ ...current, [field]: value }))
  const canContinue = Object.values(details).every(Boolean)
  const chat = () => {
    const message = `Hello, I would like to discuss an investment enquiry.\n\nName: ${details.name}\nEmail: ${details.email}\nPhone: ${details.phone}\n\nI understand this chat is for information and support only. No payment is being requested.`
    window.location.assign(`https://wa.me/${supportNumber}?text=${encodeURIComponent(message)}`)
  }

  return <section className="section checkout">
    <div className="flow-steps"><span className="current">1. Details</span><i></i><span className={step >= 2 ? 'current' : ''}>2. Review</span><i></i><span className={step >= 3 ? 'current' : ''}>3. Chat support</span></div>
    {step === 1 && <div className="checkout-form"><p>INVESTMENT ENQUIRY</p><h2>Start with your details.</h2><small>This form registers an information enquiry only. It does not accept payments or constitute an investment offer.</small><label>Full name<input value={details.name} onChange={event => update('name', event.target.value)} placeholder="Your full name" /></label><label>Email address<input value={details.email} onChange={event => update('email', event.target.value)} type="email" placeholder="you@example.com" /></label><label>Phone number<input value={details.phone} onChange={event => update('phone', event.target.value)} type="tel" placeholder="Your phone number" /></label><label>Address<input value={details.address} onChange={event => update('address', event.target.value)} placeholder="Street, city, and country" /></label><button className="button wide" onClick={() => canContinue && setStep(2)}>Review information</button></div>}
    {step === 2 && <div className="checkout-form confirmation"><p>INFORMATION RECEIVED</p><h2>Please review your details.</h2><div className="details-card"><b>{details.name}</b><span>{details.email}</span><span>{details.phone}</span><span>{details.address}</span></div><div className="notice">Your information is ready. Continue to contact support for general information only; no payment details are shown here.</div><button className="button wide" onClick={() => setStep(3)}>Continue to chat support</button><button className="text-button" onClick={() => setStep(1)}>Edit details</button></div>}
    {step === 3 && <div className="checkout-form confirmation"><p>CHAT SUPPORT</p><h2>Speak with the support team.</h2><small>Use chat support for general questions, available documentation, and preferred communication options.</small><div className="notice">For your safety, support should never request passwords, one-time codes, remote device access, or payments through chat.</div><button className="button wide" onClick={chat}>Open chat support</button></div>}
  </section>
}
