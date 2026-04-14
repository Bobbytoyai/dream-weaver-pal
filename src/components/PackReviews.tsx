import { useState, useEffect, useCallback } from "react";
import { Star, Send, Loader2, Trash2, Edit2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Review {
  id: string;
  user_id: string;
  child_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

interface PackReviewsProps {
  contentId: string;
  onRatingUpdate?: (rating: number, count: number) => void;
}

function InteractiveStars({ value, onChange, size = "w-6 h-6" }: { value: number; onChange: (v: number) => void; size?: string }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}
          className="transition-transform hover:scale-110"
        >
          <Star className={`${size} ${i <= (hover || value) ? "text-amber-400 fill-amber-400" : "text-black/20"}`} />
        </button>
      ))}
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `il y a ${days}j`;
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function PackReviews({ contentId, onRatingUpdate }: PackReviewsProps) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const myReview = reviews.find(r => r.user_id === user?.id);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("pack_reviews")
        .select("*")
        .eq("content_id", contentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setReviews((data as Review[]) || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [contentId]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const handleSubmit = async () => {
    if (!user) { toast.error("Connectez-vous pour laisser un avis"); return; }
    if (rating === 0) { toast.error("Sélectionnez une note"); return; }
    const trimmed = comment.trim();
    if (trimmed.length > 500) { toast.error("Commentaire trop long (max 500 caractères)"); return; }

    setSubmitting(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from("pack_reviews")
          .update({ rating, comment: trimmed, updated_at: new Date().toISOString() })
          .eq("id", editingId);
        if (error) throw error;
        toast.success("Avis modifié !");
      } else {
        const { error } = await supabase
          .from("pack_reviews")
          .insert({ content_id: contentId, user_id: user.id, child_name: "", rating, comment: trimmed });
        if (error) {
          if (error.code === "23505") { toast.error("Vous avez déjà donné un avis"); return; }
          throw error;
        }
        toast.success("Merci pour votre avis ! ⭐");
      }
      setRating(0);
      setComment("");
      setEditingId(null);
      await fetchReviews();

      // Notify parent of updated rating
      const avg = reviews.length > 0
        ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
        : rating;
      onRatingUpdate?.(Math.round(avg * 10) / 10, reviews.length + (editingId ? 0 : 1));
    } catch (e: any) {
      toast.error("Erreur", { description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("pack_reviews").delete().eq("id", id);
      if (error) throw error;
      toast.success("Avis supprimé");
      setEditingId(null);
      setRating(0);
      setComment("");
      await fetchReviews();
    } catch (e: any) {
      toast.error("Erreur", { description: e.message });
    }
  };

  const startEdit = (review: Review) => {
    setEditingId(review.id);
    setRating(review.rating);
    setComment(review.comment);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setRating(0);
    setComment("");
  };

  const otherReviews = reviews.filter(r => r.user_id !== user?.id);

  return (
    <div className="retro-card p-4 space-y-4">
      <h3 className="text-[15px] font-black text-black flex items-center gap-2 uppercase">
        ⭐ AVIS & NOTES
        <span className="text-[11px] font-black border-2 border-black px-2 py-0.5 bg-[var(--retro-yellow)]">
          {reviews.length} avis
        </span>
      </h3>

      {/* Rating Summary */}
      {reviews.length > 0 && (
        <div className="flex items-center gap-4 p-3 border-2 border-black bg-[var(--retro-blue)]">
          <div className="text-center">
            <p className="text-[28px] font-black text-black leading-none">
              {(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)}
            </p>
            <p className="text-[9px] font-black text-black/60 uppercase">/ 5</p>
          </div>
          <div className="flex-1 space-y-0.5">
            {[5, 4, 3, 2, 1].map(star => {
              const count = reviews.filter(r => r.rating === star).length;
              const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-black w-3">{star}</span>
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <div className="flex-1 h-2 border border-black bg-white">
                    <div className="h-full bg-amber-400" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[9px] font-bold text-black/60 w-4 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Write Review Form */}
      {user && !myReview && !editingId && (
        <div className="p-3 border-2 border-black bg-white space-y-3">
          <p className="text-[12px] font-black text-black uppercase">Donnez votre avis</p>
          <InteractiveStars value={rating} onChange={setRating} />
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Votre commentaire (optionnel)…"
            maxLength={500}
            className="w-full p-2 border-2 border-black text-[12px] font-bold text-black resize-none h-20 bg-white placeholder:text-black/30 focus:outline-none focus:border-black"
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-black/40 font-bold">{comment.length}/500</span>
            <button
              onClick={handleSubmit}
              disabled={submitting || rating === 0}
              className="flex items-center gap-2 px-4 py-2 bg-foreground text-background text-[12px] font-black border-2 border-black uppercase disabled:opacity-40"
              style={{ boxShadow: "3px 3px 0px rgba(0,0,0,0.2)" }}
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              PUBLIER
            </button>
          </div>
        </div>
      )}

      {/* Edit Form */}
      {editingId && (
        <div className="p-3 border-2 border-black bg-[var(--retro-yellow)] space-y-3">
          <p className="text-[12px] font-black text-black uppercase">Modifier votre avis</p>
          <InteractiveStars value={rating} onChange={setRating} />
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            maxLength={500}
            className="w-full p-2 border-2 border-black text-[12px] font-bold text-black resize-none h-20 bg-white placeholder:text-black/30 focus:outline-none"
          />
          <div className="flex items-center justify-between">
            <button onClick={cancelEdit} className="text-[11px] font-black text-black/60 uppercase hover:text-black">Annuler</button>
            <button
              onClick={handleSubmit}
              disabled={submitting || rating === 0}
              className="flex items-center gap-2 px-4 py-2 bg-foreground text-background text-[12px] font-black border-2 border-black uppercase disabled:opacity-40"
              style={{ boxShadow: "3px 3px 0px rgba(0,0,0,0.2)" }}
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              MODIFIER
            </button>
          </div>
        </div>
      )}

      {!user && (
        <div className="p-3 border-2 border-black bg-white text-center">
          <p className="text-[12px] font-bold text-black/60">Connectez-vous pour laisser un avis ⭐</p>
        </div>
      )}

      {/* My Review */}
      {myReview && !editingId && (
        <div className="p-3 border-2 border-black bg-[var(--retro-green)]">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black text-black uppercase">Votre avis</span>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star key={i} className={`w-3 h-3 ${i <= myReview.rating ? "text-amber-400 fill-amber-400" : "text-black/20"}`} />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => startEdit(myReview)} className="p-1 hover:bg-black/10 rounded"><Edit2 className="w-3.5 h-3.5 text-black" /></button>
              <button onClick={() => handleDelete(myReview.id)} className="p-1 hover:bg-black/10 rounded"><Trash2 className="w-3.5 h-3.5 text-black" /></button>
            </div>
          </div>
          {myReview.comment && <p className="text-[12px] text-black/80 font-bold">{myReview.comment}</p>}
          <p className="text-[9px] text-black/40 font-bold mt-1">{timeAgo(myReview.created_at)}</p>
        </div>
      )}

      {/* Other Reviews */}
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-black/30" />
        </div>
      ) : otherReviews.length > 0 ? (
        <div className="space-y-2">
          {otherReviews.slice(0, 10).map(review => (
            <div key={review.id} className="p-3 border-2 border-black bg-white">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black text-black">👤 Parent</span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star key={i} className={`w-3 h-3 ${i <= review.rating ? "text-amber-400 fill-amber-400" : "text-black/20"}`} />
                    ))}
                  </div>
                </div>
                <span className="text-[9px] text-black/40 font-bold">{timeAgo(review.created_at)}</span>
              </div>
              {review.comment && <p className="text-[12px] text-black/70 font-bold">{review.comment}</p>}
            </div>
          ))}
        </div>
      ) : !myReview ? (
        <div className="text-center py-3">
          <p className="text-[12px] text-black/40 font-bold">Aucun avis pour le moment. Soyez le premier ! 🎯</p>
        </div>
      ) : null}
    </div>
  );
}
