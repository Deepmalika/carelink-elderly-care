import { Link } from 'react-router-dom';

const STEPS = [
  { n: '01', title: 'Create a profile', body: "Add your elderly family member's details, age, condition, and care needs." },
  { n: '02', title: 'Choose a service', body: 'Browse nursing, attendant, physiotherapy, or post-hospital care options.' },
  { n: '03', title: 'Pick a caregiver', body: 'Compare verified, trained caregivers by area, experience, and availability.' },
  { n: '04', title: 'Track the visit', body: 'Get status updates and care notes in real time, from request to completion.' },
];

const CATEGORIES = [
  {
    title: 'Nursing Care',
    body: 'Registered nurses for vitals, wound care, and medication management at home.',
    image: 'https://images.unsplash.com/photo-1765896387387-0538bc9f997e?auto=format&fit=crop&w=800&h=600&q=80',
  },
  {
    title: 'Elderly Attendant',
    body: 'Trained attendants for daily living support, mobility, and companionship.',
    image: 'https://images.unsplash.com/photo-1765896387377-e293914d1e69?auto=format&fit=crop&w=800&h=600&q=80',
  },
  {
    title: 'Physiotherapy',
    body: 'Licensed physiotherapists for mobility recovery and pain management.',
    image: 'https://images.unsplash.com/photo-1764173040171-57f79264b358?auto=format&fit=crop&w=800&h=600&q=80',
  },
  {
    title: 'Post-Hospital Care',
    body: 'Focused recovery support in the days and weeks after a hospital stay.',
    image: 'https://images.unsplash.com/photo-1543333995-a78aea2eee50?auto=format&fit=crop&w=800&h=600&q=80',
  },
];

export default function Landing() {
  return (
    <div>
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-24 grid md:grid-cols-2 gap-14 items-center">
        <div>
          <p className="inline-block badge bg-amber-100 text-amber-600 mb-5 animate-fade-up">Healthcare Services · In-home care</p>
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-[1.1] mb-6 animate-fade-up delay-1">
            Trusted care for your parents, arranged in minutes.
          </h1>
          <p className="text-lg text-muted mb-8 max-w-lg animate-fade-up delay-2">
            CareLink connects senior citizens and their families with verified nurses, attendants, and
            physiotherapists for in-home medical and non-medical assistance, so you always know who's
            coming, when, and how your loved one is doing.
          </p>
          <div className="flex flex-wrap gap-4 animate-fade-up delay-3">
            <Link to="/register?role=FAMILY" className="btn-primary text-lg">
              Find a caregiver
            </Link>
            <Link to="/register?role=CAREGIVER" className="btn-secondary text-lg">
              Become a caregiver
            </Link>
          </div>
          <Link to="/triage" className="inline-block mt-4 text-pine-600 font-semibold hover:underline animate-fade-up delay-4">
            Not sure what service you need? Try our AI triage assistant →
          </Link>
        </div>

        <div className="relative animate-fade-up delay-2">
          <img
            src="https://images.unsplash.com/photo-1762955911431-4c44c7c3f408?auto=format&fit=crop&w=1000&h=1150&q=80"
            alt="A caregiver sitting with an elderly couple at home"
            className="w-full aspect-[4/5] object-cover rounded-xl2 shadow-lg"
          />
          <div className="absolute -bottom-8 -left-6 right-6 sm:right-auto sm:w-80 card !p-6 bg-pine-500 text-white border-none shadow-xl">
            <p className="font-display font-bold text-lg mb-4">Why families choose CareLink</p>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="w-6 h-6 shrink-0 rounded-full bg-white/15 grid place-items-center font-bold text-xs">✓</span>
                <span>Every caregiver verified before they meet your family.</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 shrink-0 rounded-full bg-white/15 grid place-items-center font-bold text-xs">✓</span>
                <span>Transparent pricing, shown before you book.</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 shrink-0 rounded-full bg-white/15 grid place-items-center font-bold text-xs">✓</span>
                <span>Live status updates and care notes for every visit.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* How it works: a real sequence from request to completed visit */}
      <section className="bg-white border-y border-pine-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 mt-8">
          <h2 className="text-3xl font-extrabold mb-10">How CareLink works</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {STEPS.map((s) => (
              <div key={s.n}>
                <p className="font-display font-extrabold text-3xl text-pine-300 mb-2">{s.n}</p>
                <h3 className="text-lg font-bold mb-2">{s.title}</h3>
                <p className="text-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <h2 className="text-3xl font-extrabold mb-10">Care services on CareLink</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          {CATEGORIES.map((c) => (
            <div key={c.title} className="card card-hover overflow-hidden !p-0 flex flex-col">
              <img
                src={c.image}
                alt={c.title}
                className="w-full h-44 object-cover"
                loading="lazy"
              />
              <div className="p-6">
                <h3 className="text-xl font-bold mb-2 text-pine-700">{c.title}</h3>
                <p className="text-muted">{c.body}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-10">
          <Link to="/services" className="btn-secondary">
            Browse the full service catalog
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-pine-700 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
          <h2 className="text-3xl font-extrabold mb-4">Ready to arrange care today?</h2>
          <p className="text-pine-100 mb-8 max-w-xl mx-auto">
            Register your family member in a couple of minutes and see verified caregivers available near you.
          </p>
          <Link to="/register" className="btn-amber text-lg">
            Get started, it's free
          </Link>
        </div>
      </section>
    </div>
  );
}
