import { NextRequest } from 'next/server';
import { DELETE, GET, PATCH, POST } from './route';

type CashLog = {
  id: string;
  date: string;
  description: string;
  amount: number;
  walletName: string;
};

describe('Cash Log API', () => {
  let id1: string;
  let id2: string;

  it('should create cash log entries', async () => {
    const req1 = {
      method: 'POST',
      json: async () => ({
        date: '2026-02-25',
        description: 'Lunch',
        amount: 35000,
        walletName: 'Cash',
      }),
    } as unknown as NextRequest;

    const req2 = {
      method: 'POST',
      json: async () => ({
        date: '2026-02-26',
        description: 'Freelance Payment',
        amount: 500000,
        walletName: 'BCA',
      }),
    } as unknown as NextRequest;

    const res1 = await POST(req1);
    const res2 = await POST(req2);

    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);

    const data1: CashLog = await res1.json();
    const data2: CashLog = await res2.json();

    expect(data1.description).toBe('Lunch');
    expect(data2.description).toBe('Freelance Payment');
    expect(data1.walletName).toBe('Cash');
    expect(data2.walletName).toBe('BCA');

    id1 = data1.id;
    id2 = data2.id;
  });

  it('should get all cash logs', async () => {
    const req = new NextRequest('http://localhost/api/cash-log');
    const res = await GET(req);

    expect(res.status).toBe(200);

    const data: CashLog[] = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(2);
  });

  it('should filter cash logs by date', async () => {
    const req = new NextRequest(
      'http://localhost/api/cash-log?date=2026-02-25',
    );
    const res = await GET(req);

    expect(res.status).toBe(200);

    const data: CashLog[] = await res.json();
    expect(data.length).toBeGreaterThanOrEqual(1);
    expect(data.every((log) => log.date === '2026-02-25')).toBe(true);
  });

  it('should update cash log entry', async () => {
    const req = {
      method: 'PATCH',
      json: async () => ({
        id: id1,
        description: 'Lunch Updated',
        amount: 40000,
        walletName: 'OVO',
      }),
    } as unknown as NextRequest;

    const res = await PATCH(req);

    expect(res.status).toBe(200);

    const data: CashLog = await res.json();
    expect(data.id).toBe(id1);
    expect(data.description).toBe('Lunch Updated');
    expect(data.amount).toBe(40000);
    expect(data.walletName).toBe('OVO');
  });

  it('should return 400 for missing walletName', async () => {
    const req = {
      method: 'POST',
      json: async () => ({
        date: '2026-02-27',
        description: 'Missing Wallet',
        amount: 10000,
      }),
    } as unknown as NextRequest;

    const res = await POST(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe(
      'date, description, amount, and walletName are required',
    );
  });

  it('should delete cash log entry', async () => {
    const req = {
      method: 'DELETE',
      json: async () => ({ id: id2 }),
    } as unknown as NextRequest;

    const res = await DELETE(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);

    const getReq = new NextRequest('http://localhost/api/cash-log');
    const getRes = await GET(getReq);
    const logs: CashLog[] = await getRes.json();
    expect(logs.find((log) => log.id === id2)).toBeUndefined();
  });
});
