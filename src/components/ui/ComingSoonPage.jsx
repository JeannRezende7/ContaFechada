import { Sparkles } from 'lucide-react';
import Topbar from '../layout/Topbar.jsx';

/** Used for features explicitly deferred past the MVP. */
export default function ComingSoonPage({ title, description, icon: Icon = Sparkles }) {
  return (
    <>
      <Topbar title={title} />
      <div className="p-4 md:p-8 max-w-4xl">
        <div className="bg-white rounded-card shadow-card p-10 flex flex-col items-center text-center gap-3">
          <span className="w-14 h-14 rounded-full bg-clay-50 text-clay-500 flex items-center justify-center">
            <Icon size={26} strokeWidth={1.75} />
          </span>
          <p className="text-ink-900 font-display font-semibold">{title} chega em breve</p>
          <p className="text-ink-300 text-sm max-w-xs">{description}</p>
        </div>
      </div>
    </>
  );
}
