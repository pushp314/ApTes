import DefaultTheme from 'vitepress/theme';
import './custom.css';
import { onMounted, watch, nextTick } from 'vue';
import { useRoute } from 'vitepress';

export default {
  extends: DefaultTheme,
  setup() {
    const route = useRoute();

    const renderMermaidDiagrams = async () => {
      if (typeof window === 'undefined') return;
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          securityLevel: 'loose',
          fontFamily: 'Plus Jakarta Sans, sans-serif'
        });
        await nextTick();
        const elements = document.querySelectorAll('.mermaid:not([data-processed="true"])');
        if (elements.length > 0) {
          await mermaid.run({
            nodes: Array.from(elements) as HTMLElement[]
          });
        }
      } catch (err) {
        console.error('Mermaid render error:', err);
      }
    };

    onMounted(() => {
      renderMermaidDiagrams();
    });

    watch(
      () => route.path,
      () => {
        setTimeout(renderMermaidDiagrams, 150);
      }
    );
  }
};
