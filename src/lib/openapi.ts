export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Planify API',
    version: '1.1.0',
    description:
      'Dokumentasi API Planify. Semua endpoint yang ditambah/diubah wajib disinkronkan ke spesifikasi Swagger ini. JSON spec tersedia di /api/swagger dan UI Swagger digunakan pada workflow development.',
  },
  servers: [{ url: '/' }],
  tags: [
    { name: 'Monthly Budget' },
    { name: 'Cash Log' },
    { name: 'Wallets' },
    { name: 'Wallet Transfer' },
    { name: 'Categories' },
    { name: 'Settings' },
  ],
  paths: {
    '/api/monthly-budget': {
      get: {
        tags: ['Monthly Budget'],
        summary: 'Ambil daftar monthly budget',
        description:
          'Mendukung filter query month (YYYY-MM) atau future. Jika month > bulan saat ini, API mengembalikan seluruh data.',
        parameters: [
          {
            in: 'query',
            name: 'month',
            required: false,
            schema: { type: 'string', example: '2026-03' },
            description: "Contoh: '2026-03' atau 'future'",
          },
        ],
        responses: {
          '200': {
            description: 'Sukses',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/MonthlyBudget' },
                },
                examples: {
                  success: {
                    value: [
                      {
                        id: 1,
                        name: 'Main Salary',
                        amount: 9800000,
                        month: '2026-03',
                        category: 'Salary',
                        type: 'income',
                      },
                    ],
                  },
                },
              },
            },
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Monthly Budget'],
        summary: 'Buat monthly budget baru',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MonthlyBudgetInput' },
              examples: {
                create: {
                  value: {
                    name: 'Groceries',
                    amount: 1500000,
                    month: '2026-03',
                    category: 'Food',
                    type: 'outcome',
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MonthlyBudget' },
              },
            },
          },
          '400': {
            description: 'Bad request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      patch: {
        tags: ['Monthly Budget'],
        summary: 'Update monthly budget atau reorder',
        description:
          'Jika payload berisi orderedIds, endpoint menjalankan reorder. Jika tidak, endpoint update satu item berdasarkan id.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                oneOf: [
                  { $ref: '#/components/schemas/MonthlyBudgetUpdateInput' },
                  { $ref: '#/components/schemas/ReorderBudgetInput' },
                ],
              },
              examples: {
                update: {
                  value: {
                    id: 12,
                    name: 'Groceries Updated',
                    amount: 1700000,
                  },
                },
                reorder: {
                  value: { orderedIds: [12, 11, 10, 9] },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Sukses',
            content: {
              'application/json': {
                schema: {
                  oneOf: [
                    { $ref: '#/components/schemas/MonthlyBudget' },
                    {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean', example: true },
                      },
                    },
                  ],
                },
              },
            },
          },
          '400': {
            description: 'Bad request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Monthly Budget'],
        summary: 'Hapus monthly budget',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['id'],
                properties: { id: { type: 'integer', example: 12 } },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Sukses',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { success: { type: 'boolean', example: true } },
                },
              },
            },
          },
          '400': {
            description: 'Bad request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/cash-log': {
      get: {
        tags: ['Cash Log'],
        summary: 'Ambil cash log terbaru',
        description:
          'Data diurutkan terbaru berdasarkan id desc. Mendukung filter date=YYYY-MM-DD, month=YYYY-MM, dan month=future.',
        parameters: [
          {
            in: 'query',
            name: 'date',
            required: false,
            schema: { type: 'string', example: '2026-03-14' },
          },
          {
            in: 'query',
            name: 'month',
            required: false,
            schema: { type: 'string', example: '2026-03' },
            description: "Bisa juga bernilai 'future'",
          },
        ],
        responses: {
          '200': {
            description: 'Sukses',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/CashLog' },
                },
              },
            },
          },
          '400': {
            description: 'Bad request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Cash Log'],
        summary: 'Buat cash log',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CashLogInput' },
              examples: {
                create: {
                  value: {
                    date: '2026-03-14',
                    description: 'Lunch',
                    amount: 45000,
                    walletName: 'Cash',
                    categoryId: 102,
                    excludeFromReport: false,
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CashLog' },
              },
            },
          },
          '400': {
            description: 'Bad request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      patch: {
        tags: ['Cash Log'],
        summary: 'Update cash log',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CashLogUpdateInput' },
              examples: {
                update: {
                  value: {
                    id: 55,
                    description: 'Lunch updated',
                    amount: 50000,
                    walletName: 'Cash',
                    categoryId: 102,
                    excludeFromReport: false,
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Sukses',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CashLog' },
              },
            },
          },
          '400': {
            description: 'Bad request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Cash Log'],
        summary: 'Hapus cash log',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['id'],
                properties: { id: { type: 'integer', example: 55 } },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Sukses',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { success: { type: 'boolean', example: true } },
                },
              },
            },
          },
          '400': {
            description: 'Bad request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/wallets': {
      get: {
        tags: ['Wallets'],
        summary: 'Ambil semua wallet',
        responses: {
          '200': {
            description: 'Sukses',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Wallet' },
                },
              },
            },
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Wallets'],
        summary: 'Buat wallet baru',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/WalletInput' },
              examples: {
                create: {
                  value: {
                    name: 'BCA Payroll',
                    balance: 1500000,
                    excludeFromTotal: false,
                    walletKind: 'basic',
                    goalAmount: null,
                    goalStartMonth: null,
                    goalDueMonth: null,
                  },
                },
                createGoal: {
                  value: {
                    name: 'Emergency Fund',
                    balance: 500000,
                    excludeFromTotal: true,
                    walletKind: 'goal',
                    goalAmount: 12000000,
                    goalStartMonth: '2026-03',
                    goalDueMonth: '2027-03',
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Wallet' },
              },
            },
          },
          '400': {
            description: 'Bad request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      patch: {
        tags: ['Wallets'],
        summary: 'Update wallet atau reorder wallet',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                oneOf: [
                  { $ref: '#/components/schemas/WalletUpdateInput' },
                  { $ref: '#/components/schemas/ReorderWalletInput' },
                ],
              },
              examples: {
                update: {
                  value: {
                    id: 2,
                    name: 'BCA Updated',
                    balance: 1800000,
                    excludeFromTotal: false,
                    goalAmount: null,
                    goalDueMonth: null,
                  },
                },
                reorder: {
                  value: { orderedIds: [2, 1, 3] },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Sukses',
            content: {
              'application/json': {
                schema: {
                  oneOf: [
                    { $ref: '#/components/schemas/Wallet' },
                    {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean', example: true },
                      },
                    },
                  ],
                },
              },
            },
          },
          '400': {
            description: 'Bad request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Wallets'],
        summary: 'Hapus wallet',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['id'],
                properties: { id: { type: 'integer', example: 2 } },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Sukses',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { success: { type: 'boolean', example: true } },
                },
              },
            },
          },
          '400': {
            description: 'Bad request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/wallets/transfer': {
      post: {
        tags: ['Wallet Transfer'],
        summary: 'Transfer antar wallet',
        description:
          'Membuat transfer atomik antar wallet. Secara default fee dibayar sender. Kategori transfer diprioritaskan ke Wallet Transfer In/Out.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/WalletTransferInput' },
              examples: {
                noFee: {
                  value: {
                    fromWalletId: 1,
                    toWalletId: 2,
                    amount: 300000,
                    date: '2026-03-14',
                    transferNote: 'Transfer harian',
                    enableFee: false,
                  },
                },
                withFee: {
                  value: {
                    fromWalletId: 1,
                    toWalletId: 2,
                    amount: 300000,
                    date: '2026-03-14',
                    transferNote: 'Transfer bank',
                    enableFee: true,
                    feeAmount: 6500,
                    feePayer: 'sender',
                    feeNote: 'Biaya admin bank',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Sukses',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/WalletTransferResponse' },
              },
            },
          },
          '400': {
            description: 'Bad request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/categories': {
      get: {
        tags: ['Categories'],
        summary: 'Ambil semua kategori',
        responses: {
          '200': {
            description: 'Sukses',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Category' },
                },
              },
            },
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Categories'],
        summary: 'Buat kategori baru',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CategoryCreateInput' },
              examples: {
                createRoot: {
                  value: { name: 'Food', type: 'outcome', parentId: null },
                },
                createChild: {
                  value: { name: 'Groceries', type: 'outcome', parentId: 15 },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Category' },
              },
            },
          },
          '400': {
            description: 'Bad request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      patch: {
        tags: ['Categories'],
        summary: 'Update kategori',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CategoryUpdateInput' },
              examples: {
                update: {
                  value: { id: 22, name: 'Groceries Updated', parentId: 15 },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Sukses',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Category' },
              },
            },
          },
          '400': {
            description: 'Bad request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Categories'],
        summary: 'Hapus kategori',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['id'],
                properties: { id: { type: 'integer', example: 22 } },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Sukses',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { success: { type: 'boolean', example: true } },
                },
              },
            },
          },
          '400': {
            description: 'Bad request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/settings/purge': {
      post: {
        tags: ['Settings'],
        summary: 'Purge selected data from settings page',
        description:
          'Supports deleting Cash Log and Monthly Budget by selected months or all data, deleting all wallets along with related transactions, and deleting only user-added categories.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SettingsPurgeInput' },
              examples: {
                purgeExample: {
                  value: {
                    cashLog: {
                      scope: 'months',
                      months: ['2026-02', '2026-03'],
                    },
                    monthlyBudget: { scope: 'all', months: [] },
                    deleteWallets: false,
                    deleteUserCategories: true,
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Purge completed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SettingsPurgeResponse' },
              },
            },
          },
          '400': {
            description: 'Bad request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Invalid request' },
        },
      },
      MonthlyBudgetInput: {
        type: 'object',
        required: ['name', 'amount', 'month', 'category', 'type'],
        properties: {
          name: { type: 'string' },
          amount: { type: 'integer' },
          month: { type: 'string', example: '2026-03' },
          category: { type: 'string' },
          type: { type: 'string', enum: ['income', 'outcome', 'carryover'] },
        },
      },
      MonthlyBudget: {
        allOf: [
          { $ref: '#/components/schemas/MonthlyBudgetInput' },
          {
            type: 'object',
            properties: {
              id: { type: 'integer' },
            },
            required: ['id'],
          },
        ],
      },
      MonthlyBudgetUpdateInput: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          amount: { type: 'integer' },
          month: { type: 'string' },
          category: { type: 'string' },
          type: { type: 'string', enum: ['income', 'outcome', 'carryover'] },
        },
      },
      ReorderBudgetInput: {
        type: 'object',
        required: ['orderedIds'],
        properties: {
          orderedIds: {
            type: 'array',
            items: { type: 'integer' },
          },
        },
      },
      Category: {
        type: 'object',
        required: ['id', 'name', 'type', 'parentId'],
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          type: { type: 'string', enum: ['income', 'outcome'] },
          parentId: { type: 'integer', nullable: true },
        },
      },
      CategoryCreateInput: {
        type: 'object',
        required: ['name', 'type'],
        properties: {
          name: { type: 'string' },
          type: { type: 'string', enum: ['income', 'outcome'] },
          parentId: { type: 'integer', nullable: true },
        },
      },
      CategoryUpdateInput: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          type: { type: 'string', enum: ['income', 'outcome'] },
          parentId: { type: 'integer', nullable: true },
        },
      },
      CashLogInput: {
        type: 'object',
        required: [
          'date',
          'description',
          'amount',
          'walletName',
          'categoryId',
          'excludeFromReport',
        ],
        properties: {
          date: { type: 'string', example: '2026-03-14' },
          description: { type: 'string' },
          amount: { type: 'integer', minimum: 1 },
          walletName: { type: 'string' },
          categoryId: { type: 'integer' },
          excludeFromReport: { type: 'boolean' },
        },
      },
      CashLogUpdateInput: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'integer' },
          date: { type: 'string' },
          description: { type: 'string' },
          amount: { type: 'integer', minimum: 1 },
          walletName: { type: 'string' },
          categoryId: { type: 'integer' },
          excludeFromReport: { type: 'boolean' },
        },
      },
      CashLog: {
        allOf: [
          {
            type: 'object',
            properties: {
              id: { type: 'integer' },
            },
            required: ['id'],
          },
          { $ref: '#/components/schemas/CashLogInput' },
          {
            type: 'object',
            properties: {
              category: {
                allOf: [{ $ref: '#/components/schemas/Category' }],
                nullable: true,
              },
            },
          },
        ],
      },
      WalletInput: {
        type: 'object',
        required: ['name', 'balance', 'excludeFromTotal', 'walletKind'],
        properties: {
          name: { type: 'string' },
          balance: { type: 'integer' },
          excludeFromTotal: { type: 'boolean' },
          walletKind: { type: 'string', enum: ['basic', 'goal'] },
          goalAmount: { type: 'integer', nullable: true },
          goalStartMonth: {
            type: 'string',
            nullable: true,
            example: '2026-03',
          },
          goalDueMonth: { type: 'string', nullable: true, example: '2027-03' },
        },
      },
      Wallet: {
        allOf: [
          { $ref: '#/components/schemas/WalletInput' },
          {
            type: 'object',
            required: ['id', 'sortOrder'],
            properties: {
              id: { type: 'integer' },
              sortOrder: { type: 'integer' },
            },
          },
        ],
      },
      WalletUpdateInput: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          balance: { type: 'integer' },
          excludeFromTotal: { type: 'boolean' },
          walletKind: { type: 'string', enum: ['basic', 'goal'] },
          goalAmount: { type: 'integer', nullable: true },
          goalStartMonth: {
            type: 'string',
            nullable: true,
            example: '2026-03',
          },
          goalDueMonth: { type: 'string', nullable: true, example: '2027-03' },
        },
      },
      ReorderWalletInput: {
        type: 'object',
        required: ['orderedIds'],
        properties: {
          orderedIds: {
            type: 'array',
            items: { type: 'integer' },
          },
        },
      },
      WalletTransferInput: {
        type: 'object',
        required: ['fromWalletId', 'toWalletId', 'amount', 'date', 'enableFee'],
        properties: {
          fromWalletId: { type: 'integer' },
          toWalletId: { type: 'integer' },
          amount: { type: 'number', example: 300000 },
          date: { type: 'string', example: '2026-03-14' },
          transferNote: { type: 'string' },
          enableFee: { type: 'boolean' },
          feeAmount: { type: 'number', example: 6500 },
          feePayer: { type: 'string', enum: ['sender', 'receiver'] },
          feeNote: { type: 'string' },
        },
      },
      WalletTransferResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          fromWallet: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
              balance: { type: 'integer' },
            },
          },
          toWallet: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
              balance: { type: 'integer' },
            },
          },
        },
      },
      DeleteScope: {
        type: 'string',
        enum: ['none', 'months', 'all'],
      },
      SettingsDeleteRuleInput: {
        type: 'object',
        required: ['scope', 'months'],
        properties: {
          scope: { $ref: '#/components/schemas/DeleteScope' },
          months: {
            type: 'array',
            items: { type: 'string', example: '2026-03' },
          },
        },
      },
      SettingsPurgeInput: {
        type: 'object',
        required: [
          'cashLog',
          'monthlyBudget',
          'deleteWallets',
          'deleteUserCategories',
        ],
        properties: {
          cashLog: { $ref: '#/components/schemas/SettingsDeleteRuleInput' },
          monthlyBudget: {
            $ref: '#/components/schemas/SettingsDeleteRuleInput',
          },
          deleteWallets: { type: 'boolean' },
          deleteUserCategories: { type: 'boolean' },
        },
      },
      SettingsPurgeSummary: {
        type: 'object',
        required: [
          'cashLogDeleted',
          'cashLogDeletedByWallet',
          'monthlyBudgetDeleted',
          'walletDeleted',
          'userCategoryDeleted',
        ],
        properties: {
          cashLogDeleted: { type: 'integer' },
          cashLogDeletedByWallet: { type: 'integer' },
          monthlyBudgetDeleted: { type: 'integer' },
          walletDeleted: { type: 'integer' },
          userCategoryDeleted: { type: 'integer' },
        },
      },
      SettingsPurgeResponse: {
        type: 'object',
        required: ['success', 'summary'],
        properties: {
          success: { type: 'boolean', example: true },
          summary: { $ref: '#/components/schemas/SettingsPurgeSummary' },
        },
      },
    },
  },
} as const;
