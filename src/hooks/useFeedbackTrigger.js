// src/hooks/useFeedbackTrigger.js
import { useState, useEffect } from 'react';

export default function useFeedbackTrigger() {
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('ds_fb_done')) return;
    const count = Number(localStorage.getItem('ds_proc') || '0');
    if (count >= 2) {
      const t = setTimeout(() => setShowFeedback(true), 3000);
      return () => clearTimeout(t);
    }
  }, []);

  const recordDatasetProcessed = () => {
    if (localStorage.getItem('ds_fb_done')) return;
    const count = Number(localStorage.getItem('ds_proc') || '0') + 1;
    localStorage.setItem('ds_proc', String(count));
    if (count >= 2) setTimeout(() => setShowFeedback(true), 2000);
  };

  // onSubmit is handled by FeedbackModal via the prop passed from MainApp
  const handleSubmit = async (data) => {
    try {
      localStorage.setItem('ds_feedback', JSON.stringify(data));
    } catch(e) {
      console.warn('Feedback localStorage save failed:', e);
    }
  };

  const markFeedbackDone = () => {
    setShowFeedback(false);
    localStorage.setItem('ds_fb_done', '1');
  };

  return { showFeedback, recordDatasetProcessed, markFeedbackDone, handleSubmit };
}