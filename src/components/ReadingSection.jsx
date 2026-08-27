import { useState, useEffect, useRef } from 'react';
import { BookOpen, Plus, Trash2, Upload, Calculator } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useBooks, useReadingLogs, useUserSettings, useOptimisticBookSave, useOptimisticBookDelete, useOptimisticBookUpdate, useOptimisticReadingLogSave, useOptimisticSettingsUpdate } from '@/lib/useAppData';
import { todayISO } from '@/lib/productivity';
import { useT, useI18n } from '@/lib/i18n';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { base44 } from '@/api/base44Client';

export default function ReadingSection({ activityId }) {
  const t = useT();
  const { locale } = useI18n();
  const { data: books } = useBooks();
  const { data: readingLogs } = useReadingLogs();
  const { data: settings } = useUserSettings();
  const optimisticBookSave = useOptimisticBookSave();
  const optimisticBookDelete = useOptimisticBookDelete();
  const optimisticBookUpdate = useOptimisticBookUpdate();
  const optimisticReadingLogSave = useOptimisticReadingLogSave();
  const optimisticSettingsUpdate = useOptimisticSettingsUpdate();
  const today = todayISO();

  const [showAddBook, setShowAddBook] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [showGoal, setShowGoal] = useState(false);
  const [newBook, setNewBook] = useState({ title: '', total_pages: '', target_date: '', cover_url: '' });
  const [dailyGoal, setDailyGoal] = useState('');
  const [pageInputs, setPageInputs] = useState({});
  const fileRef = useRef(null);

  useEffect(() => {
    setDailyGoal(settings?.reading_daily_goal?.toString() || '');
  }, [settings]);

  const activeBooks = (books || []).filter((b) => b.status === 'reading');

  const handleAddBook = async () => {
    if (!newBook.title || !newBook.total_pages) return;
    await optimisticBookSave(null, {
      title: newBook.title,
      total_pages: parseInt(newBook.total_pages),
      target_date: newBook.target_date || null,
      cover_url: newBook.cover_url || null,
      current_page: 0,
      status: 'reading',
    });
    setNewBook({ title: '', total_pages: '', target_date: '', cover_url: '' });
    setShowAddBook(false);
  };

  const handleCoverUpload = async (file) => {
    if (!file) return;
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setNewBook((prev) => ({ ...prev, cover_url: file_url }));
    } catch (e) {
      console.error(e);
    }
  };

  const handlePageSubmit = async (book) => {
    const pageStr = pageInputs[book.id];
    if (!pageStr) return;
    const newPage = parseInt(pageStr);
    const pagesRead = Math.max(0, newPage - (book.current_page || 0));
    await optimisticBookUpdate(book.id, { current_page: newPage });
    await optimisticReadingLogSave(null, {
      date: today,
      book_id: book.id,
      current_page: newPage,
      pages_read: pagesRead,
    });
    setPageInputs((prev) => ({ ...prev, [book.id]: '' }));
  };

  const handleDeleteBook = async (book) => {
    await optimisticBookDelete(book.id);
    if (selectedBook?.id === book.id) setSelectedBook(null);
  };

  const handleSaveGoal = async () => {
    if (!settings) return;
    await optimisticSettingsUpdate(settings.id, {
      reading_daily_goal: dailyGoal ? parseInt(dailyGoal) : 0,
    });
    setShowGoal(false);
  };

  const getBookLogs = (bookId) => (readingLogs || []).filter((l) => l.book_id === bookId).sort((a, b) => a.date.localeCompare(b.date));
  const getTodayPagesRead = (bookId) => (readingLogs || []).find((l) => l.book_id === bookId && l.date === today)?.pages_read || 0;
  const dailyGoalValue = settings?.reading_daily_goal || 0;
  const selectedBookLogs = selectedBook ? getBookLogs(selectedBook.id) : [];
  const chartData = selectedBookLogs.map((l) => ({
    date: new Date(l.date + 'T00:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
    pages: l.pages_read,
  }));

  return (
    <>
      <div className="mb-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-emerald-400" />
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('rd_daily_goal')}</p>
          </div>
          <button onClick={() => setShowGoal(true)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            {dailyGoalValue > 0 ? `${dailyGoalValue} ${t('rd_pages_day')}` : t('imposta')}
          </button>
        </div>
      </div>

      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('rd_my_books')}</h2>
          <button onClick={() => setShowAddBook(true)} className="flex items-center gap-1 text-xs font-medium text-foreground">
            <Plus size={14} /> {t('aggiungi')}
          </button>
        </div>

        {activeBooks.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-4 text-center">
            <p className="text-sm text-muted-foreground">{t('rd_no_books')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeBooks.map((book) => {
              const todayPages = getTodayPagesRead(book.id);
              const progress = book.total_pages > 0 ? Math.round((book.current_page / book.total_pages) * 100) : 0;
              const isGood = dailyGoalValue > 0 && todayPages >= dailyGoalValue;
              const isBad = dailyGoalValue > 0 && todayPages > 0 && todayPages < dailyGoalValue;
              return (
                <div key={book.id} className="rounded-2xl border border-border bg-card p-4">
                  {/* Reading pace calculator */}
                  {book.target_date && book.status === 'reading' && (() => {
                    const pagesLeft = Math.max(0, (book.total_pages || 0) - (book.current_page || 0));
                    const todayDate = new Date(today + 'T00:00:00');
                    const targetDate = new Date(book.target_date + 'T00:00:00');
                    const daysLeft = Math.ceil((targetDate - todayDate) / 86400000);
                    if (pagesLeft === 0) return null;
                    if (daysLeft <= 0) {
                      return (
                        <div className="mb-3 rounded-xl bg-red-500/10 border border-red-500/20 p-2.5">
                          <p className="text-xs text-red-400">{t('rd_target_passed')}</p>
                        </div>
                      );
                    }
                    const pagesPerDay = Math.ceil(pagesLeft / daysLeft);
                    return (
                      <div className="mb-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 flex items-center gap-2">
                        <Calculator size={14} className="text-emerald-400 shrink-0" />
                        <p className="text-xs text-emerald-400">
                          {t('rd_finish_calc').replace('{n}', pagesPerDay)} · {t('rd_days_left').replace('{n}', daysLeft)}
                        </p>
                      </div>
                    );
                  })()}
                  <div className="flex items-start gap-3 mb-3">
                    <button onClick={() => setSelectedBook(book)} className="w-16 h-24 rounded-lg overflow-hidden bg-background border border-border shrink-0">
                      {book.cover_url ? (
                        <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen size={20} className="text-muted-foreground" />
                        </div>
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <button onClick={() => setSelectedBook(book)} className="text-left">
                        <p className="font-medium truncate">{book.title}</p>
                      </button>
                      <p className="text-xs text-muted-foreground mb-2">
                        {book.current_page || 0} / {book.total_pages} {t('rd_pages')} · {progress}%
                      </p>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                    <button onClick={() => handleDeleteBook(book)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      max={book.total_pages}
                      value={pageInputs[book.id] || ''}
                      onChange={(e) => setPageInputs((prev) => ({ ...prev, [book.id]: e.target.value }))}
                      placeholder={t('rd_current_page')}
                      className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none [color-scheme:dark]"
                    />
                    <button
                      onClick={() => handlePageSubmit(book)}
                      disabled={!pageInputs[book.id]}
                      className="rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-background disabled:opacity-40"
                    >
                      {t('salva')}
                    </button>
                  </div>
                  {todayPages > 0 && dailyGoalValue > 0 && (
                    <p className={`text-xs mt-2 ${isGood ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {isGood ? t('rd_good') : t('rd_bad')} ({todayPages} {t('rd_pages_today')})
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!selectedBook} onOpenChange={(v) => !v && setSelectedBook(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedBook?.title}</DialogTitle>
          </DialogHeader>
          {chartData.length >= 1 ? (
            <div className="py-2">
              <p className="text-xs text-muted-foreground mb-3">{t('rd_progress')}</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(0 0% 45%)" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(0 0% 45%)" width={30} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(0 0% 4%)', border: '1px solid hsl(0 0% 14%)', borderRadius: 12, fontSize: 12 }}
                    formatter={(value) => [`${value} ${t('rd_pages')}`, t('rd_pages_read')]}
                  />
                  <Line type="monotone" dataKey="pages" stroke="#22c55e" strokeWidth={2} dot={{ r: 3, fill: '#22c55e' }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">{t('rd_no_data')}</p>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showAddBook} onOpenChange={setShowAddBook}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('rd_add_book')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">{t('rd_cover')}</p>
              <div className="flex items-center gap-3">
                <div className="w-16 h-24 rounded-lg overflow-hidden bg-background border border-border shrink-0">
                  {newBook.cover_url ? (
                    <img src={newBook.cover_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <button onClick={() => fileRef.current?.click()} className="w-full h-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                      <Upload size={20} />
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => fileRef.current?.click()} className="rounded-xl border border-border px-3 py-2 text-xs font-medium hover:bg-accent transition-colors">
                    {newBook.cover_url ? t('rd_change_cover') : t('rd_upload_cover')}
                  </button>
                  {newBook.cover_url && (
                    <button onClick={() => setNewBook((prev) => ({ ...prev, cover_url: '' }))} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
                      {t('rimuovi')}
                    </button>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={(e) => { const file = e.target.files?.[0]; if (file) handleCoverUpload(file); }}
                />
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">{t('rd_title')}</p>
              <input type="text" value={newBook.title} onChange={(e) => setNewBook((prev) => ({ ...prev, title: e.target.value }))} placeholder={t('rd_title_ph')} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark]" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">{t('rd_total_pages')}</p>
              <input type="number" inputMode="numeric" min="1" value={newBook.total_pages} onChange={(e) => setNewBook((prev) => ({ ...prev, total_pages: e.target.value }))} placeholder="0" className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark]" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">{t('rd_target_date')}</p>
              <input type="date" value={newBook.target_date} onChange={(e) => setNewBook((prev) => ({ ...prev, target_date: e.target.value }))} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark]" />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setShowAddBook(false)} className="rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground">{t('annulla')}</button>
            <button onClick={handleAddBook} disabled={!newBook.title || !newBook.total_pages} className="rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background disabled:opacity-40">{t('aggiungi')}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showGoal} onOpenChange={setShowGoal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('rd_goal_title')}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-xs text-muted-foreground mb-1.5">{t('rd_goal_question')}</p>
            <div className="flex items-center gap-2">
              <input type="number" inputMode="numeric" min="0" value={dailyGoal} onChange={(e) => setDailyGoal(e.target.value)} placeholder="0" className="w-24 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-center outline-none [color-scheme:dark]" />
              <span className="text-xs text-muted-foreground">{t('rd_pages_day')}</span>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setShowGoal(false)} className="rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground">{t('annulla')}</button>
            <button onClick={handleSaveGoal} className="rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background">{t('salva')}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}