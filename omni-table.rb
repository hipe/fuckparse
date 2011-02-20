module Hipe::IrcLogs
  class OmniTable
    def initialize cols, rows
      @cols = cols
      @rows = rows
    end
    attr_reader :cols, :rows
    def prerender
      @prerendered = @rows.map { |r| render_row(r) }
    end
    def render_row r
      @cols.map { |c| c.render(r[c.intern]) }
    end
    def rendered_rows
      instance_variable_defined?('@prerendered') ? @prerendered : prerender
    end
    def header_row_text
      @header_row_text ||= begin
        @header_cels = @cols.map(&:label)
        row_printf_format % @header_cels
      end
    end
    def row_printf_format
      @row_printf_format ||= begin
        @widths = instance_variable_defined?('@header_cels') ?
          Hash[ *
            @header_cels.each.with_index.map { |s,i| [i, s.length] }.flatten
          ] : Hash.new { |h, k| h[k] = 0 };
        rendered_rows.each do |row|
          row.each_with_index do |v, i|
            @widths[i] > v.length or @widths[i] = v.length
          end
        end
        (0..@widths.size-1).map { |i| "%#{@widths[i]}s" }.join(sep)
      end
    end
    def sep ; '  ' end
  end
end
