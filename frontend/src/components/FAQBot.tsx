"use client";
import { useState, useEffect } from 'react';
import { MessageSquare, Search, ChevronDown, ChevronUp, Bot, Send, X, HelpCircle, Sparkles, Zap } from 'lucide-react';
import { dbHelpers } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

export default function FAQBot() {
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('faqBotOpen') === 'true';
    }
    return false;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [faqs, setFaqs] = useState<any[]>([]);
  const [filteredFaqs, setFilteredFaqs] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>(['all']);
  const [expandedFaqs, setExpandedFaqs] = useState<number[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [botMessage, setBotMessage] = useState('');

  // Save state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('faqBotOpen', isOpen.toString());
    }
  }, [isOpen]);

  useEffect(() => {
    loadFAQs();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      searchFAQs(searchQuery);
    } else {
      setFilteredFaqs(faqs);
    }
  }, [searchQuery, faqs]);

  const loadFAQs = async () => {
    try {
      const data = await dbHelpers.getFAQs();
      setFaqs(data);
      setFilteredFaqs(data);
      
      // Extract categories
      const cats = [...new Set(data.map(f => f.category).filter(Boolean))];
      setCategories(['all', ...cats]);
    } catch (error) {
      console.error('Load FAQs error:', error);
    }
  };

  const searchFAQs = async (query: string) => {
    try {
      setIsTyping(true);
      // Simulate typing delay
      setTimeout(async () => {
        const results = await dbHelpers.searchFAQ(query);
        setFilteredFaqs(results);
        setIsTyping(false);
      }, 500);
    } catch (error) {
      console.error('Search FAQ error:', error);
      setIsTyping(false);
    }
  };

  const toggleFaq = (index: number) => {
    if (expandedFaqs.includes(index)) {
      setExpandedFaqs(expandedFaqs.filter(i => i !== index));
    } else {
      setExpandedFaqs([...expandedFaqs, index]);
    }
  };

  const filterByCategory = (category: string) => {
    setSelectedCategory(category);
    if (category === 'all') {
      setFilteredFaqs(faqs);
    } else {
      setFilteredFaqs(faqs.filter(f => f.category === category));
    }
  };

  const handleQuickQuestion = (question: string) => {
    setSearchQuery(question);
    searchFAQs(question);
  };

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const slideIn = {
    hidden: { x: -20, opacity: 0 },
    visible: { x: 0, opacity: 1 }
  };

  const scaleIn = {
    hidden: { scale: 0.9, opacity: 0 },
    visible: { scale: 1, opacity: 1 }
  };

  return (
    <motion.div 
      variants={scaleIn}
      initial="hidden"
      animate="visible"
      className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <motion.div 
          whileHover={{ rotate: 360 }}
          transition={{ duration: 0.5 }}
          className="relative"
        >
          <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-700 rounded-2xl flex items-center justify-center">
            <Bot size={24} className="text-white" />
          </div>
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-zinc-900 animate-pulse" />
        </motion.div>
        <div>
          <h3 className="font-black text-lg">Bandit Assistant</h3>
          <p className="text-[10px] text-zinc-600 font-mono">AI-powered help desk</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen(!isOpen)}
          className="ml-auto p-2 hover:bg-zinc-800 rounded-xl transition-colors"
        >
          {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </motion.button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {/* Search */}
            <motion.div 
              variants={slideIn}
              className="relative mb-4"
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ask me anything..."
                className="w-full bg-zinc-900 border border-zinc-800 pl-10 pr-4 py-3 rounded-xl outline-none focus:border-red-600 text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400"
                >
                  <X size={18} />
                </button>
              )}
            </motion.div>

            {/* Categories */}
            <motion.div 
              variants={fadeIn}
              className="flex flex-wrap gap-2 mb-6 overflow-x-auto pb-2"
            >
              {categories.map((cat) => (
                <motion.button
                  key={cat}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => filterByCategory(cat)}
                  className={`
                    px-3 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap
                    ${selectedCategory === cat
                      ? 'bg-red-600 text-white'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white'
                    }
                  `}
                >
                  {cat === 'all' ? '✨ All' : cat}
                </motion.button>
              ))}
            </motion.div>

            {/* FAQ List */}
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
              {isTyping ? (
                <div className="flex items-center gap-3 p-4 bg-zinc-900/50 rounded-xl">
                  <div className="w-8 h-8 bg-red-600/20 rounded-full flex items-center justify-center">
                    <Bot size={16} className="text-red-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce delay-75" />
                      <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce delay-150" />
                    </div>
                    <p className="text-xs text-zinc-400 mt-2">Searching for answers...</p>
                  </div>
                </div>
              ) : filteredFaqs.length === 0 ? (
                <motion.div 
                  variants={fadeIn}
                  className="text-center py-8"
                >
                  <HelpCircle size={32} className="text-zinc-700 mx-auto mb-4" />
                  <p className="text-zinc-600">No FAQs found</p>
                  <p className="text-[10px] text-zinc-700 mt-2">Try different keywords or ask the support team</p>
                </motion.div>
              ) : (
                filteredFaqs.map((faq, index) => (
                  <motion.div
                    key={faq.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden hover:border-red-600/30 transition-colors"
                  >
                    <button
                      onClick={() => toggleFaq(index)}
                      className="w-full p-4 text-left flex items-center justify-between hover:bg-zinc-900/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <MessageSquare size={16} className="text-red-600" />
                        <span className="font-medium text-sm">{faq.question}</span>
                      </div>
                      {expandedFaqs.includes(index) ? (
                        <ChevronUp size={16} className="text-zinc-600" />
                      ) : (
                        <ChevronDown size={16} className="text-zinc-600" />
                      )}
                    </button>
                    <AnimatePresence>
                      {expandedFaqs.includes(index) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-4 pt-0">
                            <div className="pl-7 border-l-2 border-red-600/30">
                              <p className="text-zinc-400 text-sm">{faq.answer}</p>
                              {faq.category && (
                                <p className="text-[10px] text-zinc-600 mt-2 font-mono">
                                  Category: {faq.category}
                                </p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))
              )}
            </div>

            {/* Quick Actions */}
            <motion.div 
              variants={fadeIn}
              className="mt-6 pt-6 border-t border-zinc-800"
            >
              <p className="text-sm text-zinc-400 mb-3 flex items-center gap-2">
                <Zap size={14} className="text-red-600" />
                Quick Actions:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "How to order?", query: "How to order" },
                  { label: "Payment issue", query: "Payment" },
                  { label: "Check progress", query: "Progress" },
                  { label: "Contact admin", query: "Contact" },
                ].map((action, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleQuickQuestion(action.query)}
                    className="p-3 bg-zinc-900 rounded-xl text-xs hover:bg-zinc-800 transition-colors text-left hover:text-red-500"
                  >
                    {action.label}
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Help Text */}
            <motion.div 
              variants={fadeIn}
              className="mt-4 p-3 bg-red-600/5 border border-red-600/10 rounded-xl"
            >
              <p className="text-[10px] text-zinc-600 text-center">
                Can't find what you need? Try the chat support tab!
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}