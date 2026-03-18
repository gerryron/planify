import Link from 'next/link';
import OfflineSummaryCard from './OfflineSummaryCard';

export default function OfflinePage() {
  return (
    <main className='min-h-[65vh] flex items-center justify-center px-5'>
      <section className='w-full max-w-md rounded-2xl border border-emerald-200 bg-white p-6 text-center shadow-sm dark:bg-slate-900 dark:border-slate-700'>
        <h1 className='text-xl font-bold text-slate-900 dark:text-slate-100'>
          Kamu sedang offline
        </h1>
        <p className='mt-3 text-sm text-slate-600 dark:text-slate-300'>
          Beberapa data masih bisa dibuka dari cache. Coba sambungkan internet
          lalu refresh untuk sinkronisasi terbaru.
        </p>
        <OfflineSummaryCard />
        <Link
          href='/'
          className='mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700'
        >
          Coba Lagi
        </Link>
      </section>
    </main>
  );
}
