import BrandIcon from './BrandIcon.jsx';

/** Shown instead of a page's content while its first data load is in flight — avoids the "zeroed values pop to real ones" flash. */
export default function LoadingScreen() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
      <BrandIcon size={56} className="w-14 h-14 animate-bounce" />
    </div>
  );
}
