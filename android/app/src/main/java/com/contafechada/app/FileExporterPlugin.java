package com.contafechada.app;

import android.content.Intent;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "FileExporter")
public class FileExporterPlugin extends Plugin {
    @PluginMethod
    public void export(PluginCall call) {
        String filename = new File(call.getString("filename", "contafechada.csv")).getName();
        String content = call.getString("content", "");
        String mimeType = call.getString("mimeType", "text/csv");

        try {
            File exportDir = new File(getContext().getCacheDir(), "exports");
            if (!exportDir.exists() && !exportDir.mkdirs()) {
                call.reject("Não foi possível preparar a pasta de exportação.");
                return;
            }
            File output = new File(exportDir, filename);
            try (FileOutputStream stream = new FileOutputStream(output)) {
                stream.write(content.getBytes(StandardCharsets.UTF_8));
            }

            Intent intent = new Intent(Intent.ACTION_SEND);
            intent.setType(mimeType);
            intent.putExtra(Intent.EXTRA_STREAM, FileProvider.getUriForFile(
                getContext(), getContext().getPackageName() + ".fileprovider", output));
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getActivity().startActivity(Intent.createChooser(intent, "Exportar lançamentos"));
            call.resolve(new JSObject());
        } catch (Exception error) {
            call.reject("Não foi possível exportar o arquivo.", error);
        }
    }
}
