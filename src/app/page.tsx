export default function Dashboard() {
  return (
    <main className='min-h-screen flex flex-col items-center justify-center bg-gray-100'>
      <h1 className='text-2xl font-bold text-gray-800'>Planify Dashboard</h1>
      <p className='text-gray-600 mt-4'>
        Welcome to your financial planning & budgeting dashboard.
      </p>
      <div className='mt-8 p-6 bg-white rounded-xl shadow'>
        <ul className='list-none p-0'>
          <li>• View your plans and budgets</li>
          <li>• Manage your todo list</li>
          <li>• Track your financial goals</li>
        </ul>
      </div>
    </main>
  );
}
