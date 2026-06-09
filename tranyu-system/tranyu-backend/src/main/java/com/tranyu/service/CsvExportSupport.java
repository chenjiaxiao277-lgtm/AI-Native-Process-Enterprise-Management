package com.tranyu.service;

final class CsvExportSupport {

    private CsvExportSupport() {
    }

    static String csvCell(Object value) {
        if (value == null) {
            return "";
        }
        String text = String.valueOf(value).replace("\"", "\"\"");
        return "\"" + text + "\"";
    }
}
