export default function Dashboard() {
  return (
    <main className='min-h-screen flex flex-col items-center justify-center'>
      <h1 className='text-2xl font-bold text-stone-800 dark:text-slate-100'>
        Planify Dashboard
      </h1>
      <p className='text-stone-600 dark:text-slate-400 mt-4'>
        Welcome to your financial planning & budgeting dashboard.
      </p>
      <div className='mt-8 p-6 bg-amber-100 dark:bg-slate-800 rounded-xl shadow'>
        <ul className='list-none p-0 text-stone-900 dark:text-slate-100'>
          <li>• View your plans and budgets</li>
          <li>• Manage your todo list</li>
          <li>• Track your financial goals</li>
        </ul>
      </div>
    </main>
  );
}
