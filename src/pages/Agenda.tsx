import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, User, Plus, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { format, addDays, startOfWeek, endOfWeek, isSameDay, parseISO, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CalendarEvent {
  id: string;
  summary: string;
  description: string;
  start: string;
  end: string;
  htmlLink: string;
  location: string;
  status: string;
}

interface Collaborator {
  id: string;
  name: string;
  type: string;
}

interface EventForm {
  summary: string;
  description: string;
  location: string;
  date: string;
  start_time: string;
  end_time: string;
}

const HOUR_HEIGHT = 60;
const START_HOUR = 7;
const END_HOUR = 24;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

const EVENT_COLORS = [
  { bg: "bg-sky-500/80", border: "border-sky-400", text: "text-white" },
  { bg: "bg-rose-500/70", border: "border-rose-400", text: "text-white" },
  { bg: "bg-violet-500/70", border: "border-violet-400", text: "text-white" },
  { bg: "bg-emerald-500/70", border: "border-emerald-400", text: "text-white" },
  { bg: "bg-amber-500/70", border: "border-amber-400", text: "text-white" },
  { bg: "bg-cyan-500/70", border: "border-cyan-400", text: "text-white" },
  { bg: "bg-pink-500/70", border: "border-pink-400", text: "text-white" },
  { bg: "bg-indigo-500/70", border: "border-indigo-400", text: "text-white" },
];

function getEventColor(summary: string) {
  let hash = 0;
  for (let i = 0; i < summary.length; i++) {
    hash = summary.charCodeAt(i) + ((hash << 5) - hash);
  }
  return EVENT_COLORS[Math.abs(hash) % EVENT_COLORS.length];
}

function getEventPosition(event: CalendarEvent) {
  const start = parseISO(event.start);
  const end = parseISO(event.end);
  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const endMinutes = end.getHours() * 60 + end.getMinutes();
  const topMinutes = startMinutes - START_HOUR * 60;
  const duration = Math.max(endMinutes - startMinutes, 20);
  return {
    top: (topMinutes / 60) * HOUR_HEIGHT,
    height: (duration / 60) * HOUR_HEIGHT,
  };
}

function isAllDay(event: CalendarEvent) {
  return !event.start || event.start.length <= 10;
}

const emptyForm: EventForm = {
  summary: "",
  description: "",
  location: "",
  date: "",
  start_time: "10:00",
  end_time: "11:00",
};

const Agenda = () => {
  const { role } = useAuth();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [selectedCollaborator, setSelectedCollaborator] = useState<string>("");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    const fetchCollaborators = async () => {
      const { data } = await supabase
        .from("collaborators")
        .select("id, name, type")
        .ilike("type", "closer")
        .order("name");
      if (data && data.length > 0) {
        setCollaborators(data);
        setSelectedCollaborator(data[0].id);
      }
    };
    fetchCollaborators();
  }, []);

  const fetchEvents = useCallback(async () => {
    if (!selectedCollaborator) return;
    setLoading(true);
    const { data } = await supabase.functions.invoke("google-calendar-events", {
      body: {
        collaborator_id: selectedCollaborator,
        time_min: weekStart.toISOString(),
        time_max: addDays(weekEnd, 1).toISOString(),
      },
    });
    setEvents(data?.events || []);
    setLoading(false);
  }, [selectedCollaborator, weekStart]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const { timedEvents, allDayEvents } = useMemo(() => {
    const timed: CalendarEvent[] = [];
    const allDay: CalendarEvent[] = [];
    events.forEach((ev) => {
      if (isAllDay(ev)) allDay.push(ev);
      else timed.push(ev);
    });
    return { timedEvents: timed, allDayEvents: allDay };
  }, [events]);

  const getEventsForDay = (day: Date, list: CalendarEvent[]) =>
    list.filter((ev) => isSameDay(parseISO(ev.start), day));

  const formatTime = (iso: string) => {
    if (!iso || iso.length <= 10) return "";
    return format(parseISO(iso), "HH:mm");
  };

  // Open dialog for new event
  const handleNewEvent = (day?: Date) => {
    setEditingEvent(null);
    setForm({
      ...emptyForm,
      date: day ? format(day, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    });
    setDialogOpen(true);
  };

  // Open dialog to edit existing event
  const handleEditEvent = (ev: CalendarEvent) => {
    setEditingEvent(ev);
    const startDate = parseISO(ev.start);
    setForm({
      summary: ev.summary,
      description: ev.description,
      location: ev.location,
      date: format(startDate, "yyyy-MM-dd"),
      start_time: ev.start.length > 10 ? format(startDate, "HH:mm") : "10:00",
      end_time: ev.end.length > 10 ? format(parseISO(ev.end), "HH:mm") : "11:00",
    });
    setDialogOpen(true);
  };

  // Save (create or update)
  const handleSave = async () => {
    if (!form.summary.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    if (!form.date) {
      toast.error("Data é obrigatória");
      return;
    }

    setSaving(true);
    const action = editingEvent ? "update" : "create";
    const { data, error } = await supabase.functions.invoke("google-calendar-manage", {
      body: {
        action,
        collaborator_id: selectedCollaborator,
        event_id: editingEvent?.id,
        event_data: {
          summary: form.summary,
          description: form.description,
          location: form.location,
          date: form.date,
          start_time: form.start_time,
          end_time: form.end_time,
        },
      },
    });
    setSaving(false);

    if (data?.success) {
      toast.success(editingEvent ? "Evento atualizado! ✅" : "Evento criado! ✅");
      setDialogOpen(false);
      fetchEvents();
    } else {
      toast.error(data?.error || error?.message || "Erro ao salvar evento");
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!editingEvent) return;
    setDeleting(true);
    const { data, error } = await supabase.functions.invoke("google-calendar-manage", {
      body: {
        action: "delete",
        collaborator_id: selectedCollaborator,
        event_id: editingEvent.id,
      },
    });
    setDeleting(false);

    if (data?.success) {
      toast.success("Evento excluído! 🗑️");
      setDialogOpen(false);
      fetchEvents();
    } else {
      toast.error(data?.error || error?.message || "Erro ao excluir evento");
    }
  };

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowTop = ((nowMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setWeekStart(addDays(weekStart, -7))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setWeekStart(addDays(weekStart, 7))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <h1 className="text-lg font-bold text-foreground">
            {format(weekStart, "MMMM yyyy", { locale: ptBR })}
          </h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }))}
            className="text-xs"
          >
            Hoje
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={() => handleNewEvent()} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Novo Evento
          </Button>
          <User className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedCollaborator} onValueChange={setSelectedCollaborator}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Selecionar closer" />
            </SelectTrigger>
            <SelectContent>
              {collaborators.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {!loading && (
        <div className="glass-card gradient-border rounded-xl overflow-hidden">
          {/* Day headers */}
          <div className="grid border-b border-border" style={{ gridTemplateColumns: "60px repeat(7, 1fr)" }}>
            <div className="border-r border-border" />
            {weekDays.map((day) => {
              const today = isToday(day);
              return (
                <div
                  key={day.toISOString()}
                  className="text-center py-3 border-r border-border last:border-r-0 cursor-pointer hover:bg-secondary/30 transition-colors"
                  onClick={() => handleNewEvent(day)}
                >
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                    {format(day, "EEE", { locale: ptBR })}
                  </p>
                  <div
                    className={cn(
                      "w-9 h-9 mx-auto flex items-center justify-center rounded-full text-lg font-bold mt-0.5",
                      today ? "bg-primary text-primary-foreground" : "text-foreground"
                    )}
                  >
                    {format(day, "d")}
                  </div>
                </div>
              );
            })}
          </div>

          {/* All-day events row */}
          {allDayEvents.length > 0 && (
            <div className="grid border-b border-border" style={{ gridTemplateColumns: "60px repeat(7, 1fr)" }}>
              <div className="border-r border-border p-1 text-[10px] text-muted-foreground flex items-center justify-end pr-2">
                dia todo
              </div>
              {weekDays.map((day) => {
                const dayAllDay = getEventsForDay(day, allDayEvents);
                return (
                  <div key={day.toISOString()} className="border-r border-border last:border-r-0 p-1 space-y-0.5">
                    {dayAllDay.map((ev) => {
                      const color = getEventColor(ev.summary);
                      return (
                        <button
                          key={ev.id}
                          onClick={() => handleEditEvent(ev)}
                          className={cn(
                            "block w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium truncate border-l-2 hover:brightness-110 transition-all",
                            color.bg, color.border, color.text
                          )}
                        >
                          {ev.summary}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

          {/* Time grid */}
          <div className="overflow-y-auto max-h-[calc(100vh-240px)]" style={{ scrollbarGutter: "stable" }}>
            <div
              className="grid relative"
              style={{
                gridTemplateColumns: "60px repeat(7, 1fr)",
                height: `${HOURS.length * HOUR_HEIGHT}px`,
              }}
            >
              {/* Hour labels */}
              <div className="relative border-r border-border">
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="absolute right-0 pr-2 text-[10px] text-muted-foreground"
                    style={{ top: `${(hour - START_HOUR) * HOUR_HEIGHT - 6}px` }}
                  >
                    {String(hour).padStart(2, "0")}:00
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {weekDays.map((day) => {
                const dayEvents = getEventsForDay(day, timedEvents);
                const today = isToday(day);

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "relative border-r border-border last:border-r-0",
                      today && "bg-primary/[0.03]"
                    )}
                  >
                    {HOURS.map((hour) => (
                      <div
                        key={hour}
                        className="absolute w-full border-t border-border/50"
                        style={{ top: `${(hour - START_HOUR) * HOUR_HEIGHT}px` }}
                      />
                    ))}

                    {dayEvents.map((ev) => {
                      const pos = getEventPosition(ev);
                      const color = getEventColor(ev.summary);
                      return (
                        <button
                          key={ev.id}
                          onClick={() => handleEditEvent(ev)}
                          className={cn(
                            "absolute left-0.5 right-1 rounded-md border-l-[3px] px-1.5 py-1 overflow-hidden text-left group hover:brightness-110 hover:shadow-lg transition-all z-10 cursor-pointer",
                            color.bg, color.border, color.text
                          )}
                          style={{
                            top: `${pos.top}px`,
                            height: `${Math.max(pos.height, 20)}px`,
                          }}
                        >
                          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Pencil className="h-3 w-3" />
                          </div>
                          <p className="text-[11px] font-semibold leading-tight line-clamp-2">
                            {ev.summary}
                          </p>
                          {pos.height > 30 && (
                            <p className="text-[10px] opacity-80 mt-0.5">
                              {formatTime(ev.start)} – {formatTime(ev.end)}
                            </p>
                          )}
                          {pos.height > 50 && ev.location && (
                            <p className="text-[9px] opacity-70 mt-0.5 truncate">
                              {ev.location}
                            </p>
                          )}
                        </button>
                      );
                    })}

                    {today && nowMinutes >= START_HOUR * 60 && nowMinutes <= END_HOUR * 60 && (
                      <div
                        className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
                        style={{ top: `${nowTop}px` }}
                      >
                        <div className="w-2.5 h-2.5 rounded-full bg-destructive -ml-1" />
                        <div className="flex-1 h-[2px] bg-destructive" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {!loading && events.length === 0 && selectedCollaborator && (
        <div className="text-center py-12">
          <CalendarDays className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Nenhum evento encontrado. Verifique se o Google Calendar está vinculado.
          </p>
        </div>
      )}

      {/* Event Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Editar Evento" : "Novo Evento"}</DialogTitle>
            <DialogDescription>
              {editingEvent
                ? "Edite os dados do evento. As alterações serão sincronizadas com o Google Calendar."
                : "Preencha os dados do evento. Ele será criado no Google Calendar do closer selecionado."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="ev-summary">Título *</Label>
              <Input
                id="ev-summary"
                placeholder="Título do evento"
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="ev-date">Data *</Label>
                <Input
                  id="ev-date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ev-start">Início</Label>
                <Input
                  id="ev-start"
                  type="time"
                  value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ev-end">Fim</Label>
                <Input
                  id="ev-end"
                  type="time"
                  value={form.end_time}
                  onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ev-location">Local</Label>
              <Input
                id="ev-location"
                placeholder="Local (opcional)"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ev-desc">Descrição</Label>
              <Textarea
                id="ev-desc"
                placeholder="Descrição (opcional)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {editingEvent && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting || saving}
                className="gap-1.5 sm:mr-auto"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Excluir
              </Button>
            )}
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving || deleting}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || deleting} className="gap-1.5">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingEvent ? "Salvar alterações" : "Criar evento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Agenda;
