use sailfish::TemplateSimple;

#[derive(TemplateSimple)]
#[template(path = "paper.stpl")]
pub struct PaperTemplate {
    pub title: String,
}
