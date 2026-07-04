import Topbar from '../layout/Topbar.jsx';

/** Used for features explicitly deferred past the MVP (REQ doc, seção "Fases"). */
export default function ComingSoonPage({ title, description }) {
  return (
    <>
      <Topbar title={title} />
      <div className="p-4 md:p-8">
        <div className="bg-white rounded-card shadow-card p-8 text-center">
          <p className="text-ink-900 font-medium mb-1">{title} chega em breve</p>
          <p className="text-ink-300 text-sm">{description}</p>
        </div>
      </div>
    </>
  );
}
